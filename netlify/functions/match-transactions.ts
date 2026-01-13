import Anthropic from '@anthropic-ai/sdk';

interface ReceiptTransaction {
  id: string;
  merchantName: string;
  date: string;
  time?: string;
  location?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  tipHandwritten?: boolean;
  printedTotal?: number;
  handwrittenTotal?: number;
  total: number;
  paymentMethod?: string;
  confidence: number;
}

interface StatementTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

interface RequestBody {
  receipts: ReceiptTransaction[];
  statements: StatementTransaction[];
}

const systemPrompt = `You are an expert financial reconciliation assistant. Your job is to match receipt transactions against bank/credit card statement entries.

## YOUR MISSION
For EACH receipt, determine if there's a matching entry in the statement. We only care about receipts - whether they match or don't match. We do NOT care about statement entries that have no receipt.

## MATCHING PRIORITY (Most Important First)

### 1. DATE IS KING
- The transaction DATE is the PRIMARY matching criteria
- Receipt date and statement date should match OR be within 1-3 days (banks sometimes post transactions a day or two later)
- If dates are more than 5 days apart, it's probably NOT a match

### 2. TIME HELPS CONFIRM
- If the receipt has a time, use it to help distinguish between multiple transactions on the same day
- A morning receipt (9am) shouldn't match an evening statement entry if there's a better time match
- Statement entries don't have times, so use time to break ties when multiple receipts are on the same day

### 3. AMOUNT SHOULD BE CLOSE
- Amounts do NOT need to match exactly!
- Tips cause differences: receipt might show $50 subtotal, but statement shows $60 (with tip)
- If receipt has a tip field, expect statement amount ≈ subtotal + tax + tip
- Allow reasonable differences: up to 25% for restaurant receipts (generous tips), up to $5 for other receipts
- If receipt shows handwrittenTotal, that's likely what hit the statement

### 4. MERCHANT NAME (Weak Signal)
- Statement descriptions are often cryptic abbreviations
- "STARBUCKS #12345 NEW YOR" might be "Starbucks Coffee"
- Don't reject a match just because names look different
- Use merchant name only to confirm, not to reject

## MATCHING RULES

1. Each receipt can match AT MOST one statement entry
2. Each statement entry can match AT MOST one receipt
3. It's OKAY for receipts to be unmatched (maybe paid cash, different card, etc.)
4. It's OKAY for statements to be unmatched (we don't care about those)
5. When in doubt about a match, mark it as a "discrepancy" rather than "confirmed"

## FOR EACH RECEIPT, DETERMINE:

**MATCHED - CONFIRMED**: Found a statement entry where:
- Date matches (same day or within 3 days)
- Amount is close (within expected tip range or $5)
- High confidence this is the same transaction

**MATCHED - DISCREPANCY**: Found a likely statement entry but:
- Amount differs more than expected
- Something seems off but it's probably the match
- User should review this one

**UNMATCHED**: No statement entry found that reasonably matches:
- No entries on or near that date
- No entries with similar amounts
- This receipt might be from a different card, paid cash, or missing from statement

## OUTPUT FORMAT

Return JSON:
{
  "matches": [
    {
      "receiptId": "receipt-xxx",
      "statementId": "statement-xxx",
      "status": "confirmed" | "discrepancy",
      "confidence": 0.0-1.0,
      "amountDifference": <receipt total minus statement amount>,
      "reasoning": "Brief explanation"
    }
  ],
  "unmatchedReceiptIds": ["receipt-xxx", ...]
}

## IMPORTANT NOTES

- Be GENEROUS with matching - if date is right and amount is ballpark, it's probably a match
- Restaurant receipts commonly have 15-25% added for tip
- The goal is to help users find discrepancies, not to be overly strict
- A "discrepancy" match is better than wrongly marking something as "unmatched"
- We trust the user uploaded the right statement for these receipts`;

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body: RequestBody = await request.json();

    if (!body.receipts || !body.statements) {
      return Response.json(
        { error: 'Missing receipts or statements data' },
        { status: 400 }
      );
    }

    if (body.receipts.length === 0) {
      return Response.json({
        success: true,
        results: {
          confirmed: [],
          discrepancies: [],
          unmatchedReceipts: [],
          unmatchedStatements: [],
        },
      });
    }

    const anthropic = new Anthropic();

    // Build a clear, structured prompt
    const receiptsFormatted = body.receipts.map(r => ({
      id: r.id,
      merchant: r.merchantName,
      date: r.date,
      time: r.time || 'unknown',
      subtotal: r.subtotal,
      tax: r.tax,
      tip: r.tip,
      tipHandwritten: r.tipHandwritten,
      total: r.total,
      handwrittenTotal: r.handwrittenTotal,
    }));

    const statementsFormatted = body.statements.map(s => ({
      id: s.id,
      date: s.date,
      description: s.description,
      amount: s.amount,
      type: s.type,
    }));

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Match these receipts to statement entries. Remember: DATE is most important, amounts should be CLOSE but not exact (tips!).

## RECEIPTS TO MATCH (${body.receipts.length} total)
${JSON.stringify(receiptsFormatted, null, 2)}

## STATEMENT ENTRIES TO SEARCH (${body.statements.length} total)
${JSON.stringify(statementsFormatted, null, 2)}

For each receipt, find the best matching statement entry or mark as unmatched. Return JSON only.`,
        },
      ],
      system: systemPrompt,
    });

    // Extract the text content from the response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

    // Parse the JSON response
    let result;
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      throw new Error('Failed to parse matching data');
    }

    // Build the results object with full transaction data
    const receiptMap = new Map(body.receipts.map(r => [r.id, r]));
    const statementMap = new Map(body.statements.map(s => [s.id, s]));

    const confirmed: Array<{
      id: string;
      receiptTransaction: ReceiptTransaction;
      statementTransaction: StatementTransaction;
      confidence: number;
      status: string;
      difference?: number;
      resolved: boolean;
    }> = [];

    const discrepancies: typeof confirmed = [];

    for (const match of result.matches || []) {
      const receipt = receiptMap.get(match.receiptId);
      const statement = statementMap.get(match.statementId);

      if (receipt && statement) {
        const fullMatch = {
          id: `match-${Date.now()}-${confirmed.length + discrepancies.length}`,
          receiptTransaction: receipt,
          statementTransaction: statement,
          confidence: match.confidence,
          status: match.status,
          difference: match.amountDifference || (receipt.total - statement.amount),
          resolved: false,
        };

        if (match.status === 'confirmed') {
          confirmed.push(fullMatch);
        } else {
          discrepancies.push(fullMatch);
        }
      }
    }

    // Only get unmatched receipts - we don't care about unmatched statements
    const unmatchedReceipts = (result.unmatchedReceiptIds || [])
      .map((id: string) => receiptMap.get(id))
      .filter(Boolean);

    return Response.json({
      success: true,
      results: {
        confirmed,
        discrepancies,
        unmatchedReceipts,
        unmatchedStatements: [], // We don't care about these
      },
    });
  } catch (error) {
    console.error('Error matching transactions:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to match transactions',
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/api/match-transactions',
};
