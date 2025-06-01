import React, { useState, useRef } from 'react';
import { X, Upload, FileText, FileImage, FilePlus } from 'lucide-react';
import axios from 'axios';

const FileUploadModal = ({ isOpen, onClose, onFileAnalyzed }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadError('');
    }
  };

  const getFileIcon = () => {
    if (!file) return <FilePlus size={48} className="text-gray-400" />;
    if (file.type.startsWith('image/')) {
      return <FileImage size={48} className="text-blue-500" />;
    } else {
      return <FileText size={48} className="text-blue-500" />;
    }
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      } else {
        resolve(`[Binary file: ${file.name}]`);
      }
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      // Upload the file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || 'Upload failed');
      }

      const fileData = uploadResponse.data.data;

      // Read file content for analysis
      setIsAnalyzing(true);
      const fileContent = await readFileContent(file);

      // Send content for AI analysis
      const analysisResponse = await axios.post('/api/ai/analyze-file', {
        fileContent,
        fileName: file.name,
        fileType: file.type
      }, { withCredentials: true });

      if (!analysisResponse.data.success) {
        throw new Error(analysisResponse.data.message || 'Analysis failed');
      }

      // Combine file data with analysis and message
      const result = {
        ...fileData,
        analysis: analysisResponse.data.data.analysis,
        message: message
      };

      onFileAnalyzed(result);
      onClose();
    } catch (error) {
      console.error('File upload/analysis error:', error);
      setUploadError(error.message || 'Failed to process file');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden transition-all duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium">Upload File</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center">
            {getFileIcon()}
            <input
              type="file"
              ref={fileInputRef}
              className="mt-4"
              onChange={handleFileChange}
              accept="image/*,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            <div className="mt-4 w-full">
              {file ? (
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium text-center">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Select a file to upload
                </p>
              )}
            </div>
            <textarea
              className="w-full mt-4 rounded border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Add a message (optional)..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-gray-400 mt-2 text-center">
              Supported formats: Images, PDF, Text, Word
            </p>
          </div>

          {uploadError && (
            <div className="mt-3 text-red-500 text-sm text-center">
              {uploadError}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 mr-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              disabled={isUploading || isAnalyzing}
            >
              Cancel
            </button>

            <button
              onClick={handleUpload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200 flex items-center"
              disabled={!file || isUploading || isAnalyzing}
            >
              {isUploading || isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isAnalyzing ? 'Analyzing...' : 'Uploading...'}
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-1" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;