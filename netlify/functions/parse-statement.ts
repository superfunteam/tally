import Anthropic from '@anthropic-ai/sdk';

interface StatementTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

interface RequestBody {
  pdf: string; // base64 encoded PDF
}

const systemPrompt = `You are an expert at parsing bank and credit card statements. Your task is to extract ALL transactions from the statement.

For each transaction, extract:
- date: Transaction date (format: YYYY-MM-DD)
- description: Merchant name or transaction description
- amount: Transaction amount (always positive number)
- type: "debit" for charges/purchases, "credit" for payments/refunds

Important rules:
1. Extract EVERY transaction visible in the statement
2. Maintain chronological order
3. For credit card statements: purchases are "debit", payments are "credit"
4. For bank statements: withdrawals/purchases are "debit", deposits are "credit"
5. Clean up merchant names (remove extra codes, locations, etc.) but keep them recognizable
6. Be careful with dates - use the transaction date, not posting date if both are shown

Return a JSON object with:
{
  "pageCount": <number of pages analyzed>,
  "transactions": [<array of transaction data>]
}

If the document is not a valid statement or unreadable, return:
{
  "pageCount": 0,
  "transactions": [],
  "error": "<description of the issue>"
}`;

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body: RequestBody = await request.json();

    if (!body.pdf) {
      return Response.json(
        { error: 'Missing PDF data' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: body.pdf,
              },
            },
            {
              type: 'text',
              text: 'Parse this bank/credit card statement and extract all transactions. Return only valid JSON with the transaction list.',
            },
          ],
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
      throw new Error('Failed to parse statement data');
    }

    if (result.error) {
      return Response.json({
        success: false,
        error: result.error,
        pageCount: 0,
        transactions: [],
      });
    }

    // Add unique IDs to transactions
    const transactions: StatementTransaction[] = (result.transactions || []).map(
      (t: StatementTransaction, index: number) => ({
        ...t,
        id: `statement-${Date.now()}-${index}`,
      })
    );

    return Response.json({
      success: true,
      pageCount: result.pageCount || 1,
      transactions,
    });
  } catch (error) {
    console.error('Error parsing statement:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse statement',
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/api/parse-statement',
};
