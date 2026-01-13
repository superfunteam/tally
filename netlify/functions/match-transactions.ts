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

interface TransactionMatch {
  receiptId: string;
  statementId: string;
  confidence: number;
  status: 'confirmed' | 'discrepancy';
  difference?: number;
  reasoning: string;
}

interface RequestBody {
  receipts: ReceiptTransaction[];
  statements: StatementTransaction[];
}

const systemPrompt = `You are an expert at matching receipt transactions to bank/credit card statement entries.

Your task is to analyze two lists of transactions and find matches between receipts and statement entries.

Matching criteria (in order of importance):
1. Amount matching:
   - Exact match is ideal
   - Consider tip variations (receipt total with tip vs statement amount)
   - Allow small differences (< $0.10) for rounding
2. Date matching:
   - Same day is ideal
   - Allow up to 3 days difference (for pending transactions)
3. Merchant matching:
   - Compare receipt merchant name with statement description
   - Statement descriptions are often abbreviated or coded

For each match, provide:
- receiptId: The ID of the matched receipt
- statementId: The ID of the matched statement entry
- confidence: Your confidence in this match (0.0-1.0)
- status: "confirmed" if amounts match (within $0.10), "discrepancy" if there's a difference
- difference: The amount difference (receipt total - statement amount), if any
- reasoning: Brief explanation of why this is a match

Return a JSON object:
{
  "matches": [<array of matches>],
  "unmatchedReceiptIds": [<array of receipt IDs without matches>],
  "unmatchedStatementIds": [<array of statement IDs without matches>]
}

Important:
- Each receipt can only match ONE statement entry
- Each statement entry can only match ONE receipt
- Only create matches you're reasonably confident about (>0.6)
- It's better to leave something unmatched than create a wrong match`;

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

    if (body.receipts.length === 0 && body.statements.length === 0) {
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Please match these receipt transactions to statement entries.

RECEIPT TRANSACTIONS:
${JSON.stringify(body.receipts, null, 2)}

STATEMENT TRANSACTIONS:
${JSON.stringify(body.statements, null, 2)}

Analyze and return matches as JSON.`,
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

    const confirmed: TransactionMatch[] = [];
    const discrepancies: TransactionMatch[] = [];

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
          difference: match.difference,
          resolved: false,
        };

        if (match.status === 'confirmed') {
          confirmed.push(fullMatch);
        } else {
          discrepancies.push(fullMatch);
        }
      }
    }

    const unmatchedReceipts = (result.unmatchedReceiptIds || [])
      .map((id: string) => receiptMap.get(id))
      .filter(Boolean);

    const unmatchedStatements = (result.unmatchedStatementIds || [])
      .map((id: string) => statementMap.get(id))
      .filter(Boolean);

    return Response.json({
      success: true,
      results: {
        confirmed,
        discrepancies,
        unmatchedReceipts,
        unmatchedStatements,
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
