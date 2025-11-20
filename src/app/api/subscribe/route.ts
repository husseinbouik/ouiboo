import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { format } from 'date-fns'; // <--- IMPORT THIS

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, userType, phoneNumber, agencyName } = body;
    // Update validation: phone number is now required
    if (!name || !email || !userType || !phoneNumber) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Authenticate with Google
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const sheets = google.sheets({
      auth,
      version: 'v4',
    });

    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

    const newRow = [
      name,
      email,
      phoneNumber,
      userType,
      agencyName || '',
      timestamp, // <--- USE THE FORMATTED TIMESTAMP
    ];

    // Append the new data to the spreadsheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ message: 'Success!' }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}