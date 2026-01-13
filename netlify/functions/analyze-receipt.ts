import { GoogleGenAI } from '@google/genai';

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

const systemPrompt = `You are an expert receipt analyzer with excellent OCR skills. Extract transaction information from receipt images with HIGH ACCURACY for amounts.

IMPORTANT: A single image may contain MULTIPLE receipts. First, count how many distinct receipts are visible, then extract data from each one.

## AMOUNT EXTRACTION PRIORITY (Most to Least Reliable)

1. **PRINTED AMOUNTS** - Thermal printer text is most reliable
   - Subtotal, Tax, Printed Total are typically accurate
   - These are your ground truth when available

2. **HANDWRITTEN AMOUNTS** - Only use when clearly legible
   - Tips are usually handwritten
   - Sometimes totals are handwritten (after adding tip)
   - If handwriting is unclear/ambiguous, mark as unclear

3. **CALCULATED AMOUNTS** - When handwritten is unclear
   - If you can read subtotal, tax, and tip but NOT the handwritten total:
     Calculate total = subtotal + tax + tip
   - This calculated total is more reliable than guessing unclear handwriting

## FOR EACH RECEIPT, EXTRACT:
- merchantName: The store/restaurant name
- date: Transaction date (format: YYYY-MM-DD)
- time: Transaction time if visible (format: HH:MM)
- location: Store address/location if visible
- subtotal: PRINTED subtotal (before tax and tip)
- tax: PRINTED tax amount
- tip: Tip amount (may be handwritten) - set to 0 if no tip line
- tipHandwritten: true if tip is handwritten, false if printed or absent
- printedTotal: The PRINTED total on the receipt
- handwrittenTotal: The HANDWRITTEN total if present and clearly legible (omit if unclear)
- total: The FINAL amount to use:
  1. Use handwrittenTotal if clearly legible
  2. Otherwise, CALCULATE from subtotal + tax + tip
  3. Only use printedTotal as fallback if no tip was added
- paymentMethod: Card type or cash if visible
- confidence: Your confidence in this extraction (0.0-1.0)

## VERIFICATION CHECKLIST
Before finalizing each receipt:
1. Does subtotal + tax + tip ≈ total? If not, recheck amounts
2. Is the tip reasonable (0-30% of subtotal)?
3. Are all decimal points correctly placed?
4. If math doesn't add up, lower confidence and note discrepancy

Return JSON:
{
  "receiptCount": <number of receipts found>,
  "transactions": [<array of receipt data>]
}

If you cannot read a field clearly, omit it rather than guess.
CRITICAL: Getting the total wrong is the worst error - when in doubt, calculate from parts.`;

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

    // Netlify AI Gateway automatically injects credentials
    const ai = new GoogleGenAI({});

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [
        {
          inlineData: {
            mimeType: body.mimeType,
            data: body.image,
          },
        },
        'Analyze this receipt image and extract all transaction data. Remember to check for multiple receipts and handwritten tips/totals. Prioritize printed amounts, then clearly legible handwritten amounts, and calculate totals when handwriting is unclear. Return only valid JSON.',
      ],
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const text = response.text;

    // Parse the JSON response
    let result;
    try {
      // Try to extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
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
