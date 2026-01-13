import Anthropic from '@anthropic-ai/sdk';

interface ReceiptTransaction {
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

interface RequestBody {
  image: string; // base64 encoded image
  mimeType: string;
}

const systemPrompt = `You are an expert receipt analyzer. Your task is to extract transaction information from receipt images with HIGH ACCURACY for amounts.

IMPORTANT: A single image may contain MULTIPLE receipts. First, count how many distinct receipts are visible, then extract data from each one.

For each receipt found, extract:
- merchantName: The store/restaurant name
- date: Transaction date (format: YYYY-MM-DD)
- time: Transaction time if visible (format: HH:MM)
- location: Store address/location if visible
- subtotal: Amount before tax and tip (the printed subtotal)
- tax: Tax amount
- tip: Tip amount - CRITICAL: check for BOTH printed and handwritten tips!
- tipHandwritten: true if the tip appears to be handwritten, false if printed
- printedTotal: The PRINTED total on the receipt (before any handwritten modifications)
- handwrittenTotal: If there's a handwritten total that differs from printed, include it here
- total: The ACTUAL final amount (use handwrittenTotal if present and legible, otherwise printedTotal)
- paymentMethod: Card type or cash if visible
- confidence: Your confidence in this extraction (0.0-1.0)

HANDWRITTEN TIP DETECTION - This is critical for accuracy:
1. Look for handwritten numbers on the "Tip:" or "Gratuity:" line
2. Look for handwritten totals on the "Total:" line or at the bottom
3. Look for slashes, crossed out numbers, or corrections
4. Handwriting typically looks different from thermal printer text
5. If handwrittenTotal exists: tip = handwrittenTotal - printedTotal (approximately)
6. Compare subtotal + tax + tip to verify the total makes sense

VERIFICATION: Always verify that subtotal + tax + tip ≈ total. If they don't match, lower your confidence and note the discrepancy.

Return a JSON object with:
{
  "receiptCount": <number of receipts found>,
  "transactions": [<array of receipt data>]
}

If you cannot read a field, omit it. Always include merchantName, date, total, and confidence.
Be extremely careful with decimal points and currency amounts - getting the total wrong is a critical error.`;

export default async (request: Request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body: RequestBody = await request.json();

    if (!body.image || !body.mimeType) {
      return Response.json(
        { error: 'Missing image or mimeType' },
        { status: 400 }
      );
    }

    // Validate mime type
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimeTypes.includes(body.mimeType)) {
      return Response.json(
        { error: 'Invalid image type. Supported: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: body.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: body.image,
              },
            },
            {
              type: 'text',
              text: 'Analyze this receipt image and extract all transaction data. Remember to check for multiple receipts and handwritten tips. Return only valid JSON.',
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
      // Try to extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text);
      throw new Error('Failed to parse receipt data');
    }

    // Add unique IDs to transactions
    const transactions: ReceiptTransaction[] = (result.transactions || []).map(
      (t: ReceiptTransaction, index: number) => ({
        ...t,
        id: `receipt-${Date.now()}-${index}`,
      })
    );

    return Response.json({
      success: true,
      receiptCount: result.receiptCount || transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze receipt',
      },
      { status: 500 }
    );
  }
};

export const config = {
  path: '/api/analyze-receipt',
};
