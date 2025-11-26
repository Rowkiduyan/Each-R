-- Create the application-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-files',
  'application-files',
  true,  -- Public bucket so files can be accessed via public URLs
  52428800,  -- 50MB file size limit (adjust as needed)
  ARRAY[]::text[]  -- Empty array means all file types allowed
);

-- Set up storage policies to allow authenticated users to upload files
-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'application-files');

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'application-files');

-- Policy: Allow public read access (since bucket is public)
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'application-files');

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'application-files');

