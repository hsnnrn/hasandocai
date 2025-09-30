# Supabase Upload Functionality Guide

## Overview
The "Supabase'e Aktar" (Transfer to Supabase) button now actually saves analysis results to your Supabase database. This guide explains how to set it up and use it.

## Prerequisites

### 1. Supabase Project Setup
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or use an existing one
3. Note down your project URL and anon key

### 2. Database Schema Setup
Run the SQL schema in your Supabase project:
```sql
-- Copy and paste the contents of sql/supabase_schema.sql into your Supabase SQL Editor
```

### 3. Environment Variables
Add these to your `.env` file:
```env
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. OAuth Setup (Optional but Recommended)
If you want to use OAuth authentication:
```env
SUPABASE_OAUTH_CLIENT_ID=your_oauth_client_id
SUPABASE_OAUTH_CLIENT_SECRET=your_oauth_client_secret
```

## How It Works

### 1. Analysis Process
1. Upload a document (PDF, DOCX, Excel, PowerPoint)
2. The app analyzes the document and extracts text sections
3. AI generates commentary and insights
4. Results are stored locally in the app

### 2. Supabase Upload
1. Click the "Supabase'e Aktar" button on the analysis results page
2. The app will:
   - Connect to your selected Supabase project
   - Create a document record
   - Insert all text sections
   - Insert all AI commentary
   - Show success/error messages

### 3. Data Structure
The following data is saved to Supabase:

#### Documents Table
- Document metadata (title, filename, file type, page count)
- User information
- Timestamps

#### Text Sections Table
- Extracted text content
- Page numbers and section titles
- Content type and formatting information
- Order index for proper sequencing

#### AI Commentary Table
- AI-generated analysis and insights
- Commentary type (summary, key points, analysis, etc.)
- Confidence scores
- Language and model information

## Usage Instructions

### 1. Login and Select Project
1. Click the Supabase login button
2. Authenticate with your Supabase account
3. Select the project where you want to save the data

### 2. Analyze Documents
1. Upload documents using the file drop zone
2. Wait for analysis to complete
3. Review the analysis results

### 3. Upload to Supabase
1. Click "Supabase'e Aktar" button
2. Wait for the upload to complete
3. Check the success message for details

## Troubleshooting

### Common Issues

#### "No Supabase project selected"
- Make sure you've logged in and selected a project
- Try logging out and logging back in

#### "Failed to insert document"
- Check your Supabase project URL and anon key
- Ensure the database schema is properly set up
- Check your RLS (Row Level Security) policies

#### "Authentication failed"
- Verify your Supabase credentials
- Check if your project is active
- Ensure you have the correct permissions

### Debug Information
- Check the console logs for detailed error messages
- Verify your `.env` file has the correct values
- Test your Supabase connection in the Supabase dashboard

## Database Schema

The app uses the following main tables:

1. **documents** - Stores document metadata
2. **text_sections** - Stores extracted text content
3. **ai_commentary** - Stores AI-generated analysis
4. **embeddings** - Stores vector embeddings for semantic search (future use)

## Security Notes

- The app uses Row Level Security (RLS) policies
- Make sure to configure proper RLS policies for your use case
- Consider using authenticated users instead of anonymous access for production

## Future Enhancements

- Vector embeddings for semantic search
- Document versioning
- Collaborative features
- Advanced analytics and reporting
