import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight } from 'lucide-react';

// Reliable worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js',import.meta.url).toString();
export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are allowed');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Store correctly for EditPDF
      sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(bytes)));

      console.log(`✅ PDF stored successfully (${bytes.length} bytes)`);

      // Navigate to EditPDF
      window.location.href = createPageUrl('EditPDF');
    } catch (err) {
      console.error(err);
      setError('Failed to process PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4">SignPDF</h1>
          <p className="text-2xl text-zinc-400">Upload • Edit • Sign</p>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-10 shadow-2xl border border-zinc-800">
          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            <Upload className="mx-auto h-16 w-16 text-zinc-500 mb-6" />
            <p className="text-xl mb-2">Drop your PDF here</p>
            <p className="text-zinc-500 mb-8">or click to browse</p>

            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="cursor-pointer inline-flex items-center px-8 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-lg font-medium transition"
            >
              Choose PDF File
            </label>
          </div>

          {file && (
            <div className="mt-6 text-center text-zinc-400">
              Selected: <span className="text-white font-medium">{file.name}</span>
            </div>
          )}

          {error && <p className="mt-4 text-red-500 text-center">{error}</p>}

          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full mt-8 py-6 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? 'Processing...' : 'Upload & Open Editor'}
            {!loading && <ArrowRight className="ml-3 h-5 w-5" />}
          </Button>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-8">
          Files are processed locally in your browser — nothing is uploaded to any server
        </p>
      </div>
    </div>
  );
}
