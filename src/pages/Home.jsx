import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Upload, Plus, ArrowRight } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return setError('Please select a PDF');
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(bytes)));
      window.location.href = createPageUrl('EditPDF');
    } catch (err) {
      setError('Failed to process PDF');
    } finally {
      setLoading(false);
    }
  };

  const createBlankTemplate = async () => {
    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595, 842]); // A4
      const bytes = await pdfDoc.save();
      sessionStorage.setItem('editPdfBytes', JSON.stringify(Array.from(bytes)));
      window.location.href = createPageUrl('EditPDF');
    } catch (err) {
      setError('Failed to create blank PDF');
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
          <Button onClick={createBlankTemplate} className="w-full mb-6 py-6 text-lg bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
            <Plus className="mr-3" /> Create Blank Template (A4)
          </Button>

          <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center">
            <Upload className="mx-auto h-16 w-16 text-zinc-500 mb-6" />
            <p className="text-xl mb-2">Or upload your PDF</p>
            <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
            <label htmlFor="pdf-upload" className="cursor-pointer inline-flex items-center px-8 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-lg font-medium transition">
              Choose PDF File
            </label>
          </div>

          {file && <p className="text-center mt-4 text-zinc-400">Selected: {file.name}</p>}
          {error && <p className="text-red-500 text-center mt-4">{error}</p>}

          <Button onClick={handleUpload} disabled={!file || loading} className="w-full mt-8 py-6 text-lg bg-indigo-600 hover:bg-indigo-700">
            {loading ? 'Processing...' : 'Upload & Open Editor'} <ArrowRight className="ml-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
