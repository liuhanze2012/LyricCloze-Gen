import React, { useState, useRef, useMemo } from 'react';
import { SongData, ClozeResult, AppState } from './types';
import { generateClozeGame } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [songData, setSongData] = useState<SongData>({
    title: '',
    artist: '',
    originalLyrics: '',
    coverImage: null
  });
  const [result, setResult] = useState<ClozeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate layout settings focusing on Readability and Aesthetics
  const layoutSettings = useMemo(() => {
    if (!result) return null;
    const lines = result.lines;
    
    // Calculate density to decide between "Standard" (2 col) or "Short" (1 col centered)
    const CHARS_PER_VISUAL_LINE = 55; 
    
    const visualDensity = lines.reduce((acc, line) => {
      const len = line.length;
      if (len === 0) return acc + 1;
      return acc + Math.ceil(len / CHARS_PER_VISUAL_LINE);
    }, 0);

    // Default Settings: Balanced & Readable (Most songs)
    // 16px (12pt equivalent) text with generous spacing
    let settings = {
      textSize: 'text-base',      
      lineHeight: 'leading-relaxed', 
      tracking: 'tracking-normal',
      titleSize: 'text-3xl',
      artistSize: 'text-xl',
      imageSize: 'w-28 h-28',
      headerMb: 'mb-8',
      padding: 'p-[20mm]',
      colGap: 'gap-12',
      columnCount: 'columns-1 md:columns-2 print:columns-2',
    };

    if (visualDensity > 65) {
      // Long Content: Slightly more compact but strictly readable
      // 14px (11pt equivalent) is the floor. We do not go smaller.
      settings = {
        ...settings,
        textSize: 'text-sm',    
        lineHeight: 'leading-6', // 1.5 spacing
        colGap: 'gap-8',
        imageSize: 'w-24 h-24',
        titleSize: 'text-2xl',
        artistSize: 'text-lg',
        headerMb: 'mb-6',
      };
    } else if (visualDensity < 25) {
      // Short Content: Elegant, centered, large text
      settings = {
        ...settings,
        textSize: 'text-lg',    
        lineHeight: 'leading-loose', // 2.0 spacing
        tracking: 'tracking-wide',
        colGap: 'gap-0',
        columnCount: 'max-w-2xl mx-auto', 
        imageSize: 'w-32 h-32',
        titleSize: 'text-4xl',
        headerMb: 'mb-10',
      };
    }

    return settings;
  }, [result]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSongData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSongData(prev => ({ ...prev, coverImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songData.originalLyrics.trim()) {
      setError("Please enter lyrics.");
      return;
    }

    setAppState(AppState.GENERATING);
    setError(null);

    try {
      const data = await generateClozeGame(songData.originalLyrics);
      setResult(data);
      setAppState(AppState.READY);
    } catch (err) {
      setError("Failed to generate the game. Please try again.");
      setAppState(AppState.ERROR);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    if (!result || !layoutSettings) return;

    // --- Helper: Map Tailwind/App settings to CSS for Word ---
    const getWordStyles = (settings: any) => {
      // 1. Font Size - Map to Standard Word Sizes (Points)
      const sizeMap: Record<string, string> = {
        'text-sm': '11pt',   // Standard Body
        'text-base': '12pt', // Large Body
        'text-lg': '14pt',   // Header-like Body
        'text-xl': '16pt',
        'text-2xl': '18pt',
        'text-3xl': '24pt',
        'text-4xl': '28pt',
      };
      
      const fontSize = sizeMap[settings.textSize] || '12pt';
      const titleSize = sizeMap[settings.titleSize] || '24pt';
      const artistSize = sizeMap[settings.artistSize] || '14pt';

      // 2. Line Height - Percentage for Word
      const lhMap: Record<string, string> = {
        'leading-6': '130%',      
        'leading-relaxed': '150%', // Standard 1.5 lines
        'leading-loose': '200%',  
      };
      const lineHeight = lhMap[settings.lineHeight] || '150%';

      // 3. Spacing
      const letterSpacing = settings.tracking.includes('wide') ? '0.5pt' : '0';

      // 4. Margins - Standard 1 inch (2.54cm)
      const margin = '2.54cm';

      // 5. Columns
      const cols = settings.columnCount.includes('columns-2') ? 2 : 1;
      
      // 6. Image Dimensions (px)
      const imgMap: Record<string, string> = {
        'w-24 h-24': '96',
        'w-28 h-28': '112',
        'w-32 h-32': '128',
        'w-40 h-40': '160',
      };
      const imgDim = imgMap[settings.imageSize] || '112';

      return { fontSize, titleSize, artistSize, lineHeight, letterSpacing, margin, cols, imgDim };
    };

    const styles = getWordStyles(layoutSettings);

    // HTML Content optimized for MS Word
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${songData.title}</title>
        <style>
          @page Section1 {
            size: 595.3pt 841.9pt; /* A4 */
            margin: ${styles.margin};
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source: 0;
            ${styles.cols > 1 ? `mso-columns: ${styles.cols} even 0.5in;` : ''}
          }
          div.Section1 { page: Section1; }
          
          body { 
            font-family: 'Calibri', 'Arial', sans-serif; /* Clean, modern font */
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            letter-spacing: ${styles.letterSpacing};
            color: #000;
          }
          
          h1 { font-family: 'Arial', sans-serif; font-size: ${styles.titleSize}; font-weight: bold; margin-bottom: 6pt; color: #111; }
          h2 { font-family: 'Arial', sans-serif; font-size: ${styles.artistSize}; font-weight: normal; margin-bottom: 12pt; color: #555; }
          
          /* Paragraph spacing */
          p { margin: 0 0 8pt 0; mso-pagination: widow-orphan; }
          
          .header-table { width: 100%; border-bottom: 1.5pt solid #eee; margin-bottom: 24pt; padding-bottom: 12pt; }
          
          /* Explicit dimensions for Word images */
          img { width: ${styles.imgDim}px; height: ${styles.imgDim}px; }
        </style>
      </head>
      <body>
        <div class=Section1>
          <table class="header-table">
            <tr>
              <td valign="middle">
                <h1>${songData.title}</h1>
                <h2>${songData.artist}</h2>
                <p style="font-size: 10pt; color: #777; margin-top: 4pt; text-transform: uppercase; letter-spacing: 1pt;">Listening Cloze Exercise</p>
              </td>
              <td valign="middle" align="right" width="${parseInt(styles.imgDim) + 20}">
                ${songData.coverImage 
                  ? `<img src="${songData.coverImage}" width="${styles.imgDim}" height="${styles.imgDim}" alt="Cover" />` 
                  : ''}
              </td>
            </tr>
          </table>
          ${result.lines.map(line => `<p>${line === '' ? '&nbsp;' : line}</p>`).join('')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${songData.title.replace(/[^a-z0-9]/gi, '_')}_cloze.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setResult(null);
  };

  if (appState === AppState.READY && result && layoutSettings) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 print:bg-white print:p-0 print:block">
        <div className="w-full max-w-[210mm] mb-6 flex flex-col sm:flex-row justify-between items-center px-4 gap-4 print:hidden">
          <button onClick={handleReset} className="px-4 py-2 bg-gray-600 text-white rounded shadow hover:bg-gray-700 transition flex items-center gap-2">
            <span>←</span> Edit / New
          </button>
          <div className="flex gap-3">
             <button onClick={handleExportWord} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded shadow hover:bg-indigo-700 transition flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Export to Word
            </button>
             <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 transition flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
              </svg>
              Print to PDF
            </button>
          </div>
        </div>

        <div className={`bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] ${layoutSettings.padding} flex flex-col relative mx-auto print:mx-0 print:w-full print:h-auto`}>
          <header className={`flex justify-between items-start ${layoutSettings.headerMb} border-b-2 border-gray-100 pb-4 flex-shrink-0`}>
            <div className="flex-1 pr-6">
              <h1 className={`font-serif ${layoutSettings.titleSize} font-bold text-gray-900 leading-tight mb-1`}>
                {songData.title || "Untitled Song"}
              </h1>
              <h2 className={`${layoutSettings.artistSize} text-gray-600 font-medium`}>
                {songData.artist || "Unknown Artist"}
              </h2>
              <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Listening Cloze Exercise
              </div>
            </div>
            
            <div className={`${layoutSettings.imageSize} flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200`}>
              {songData.coverImage ? (
                <img 
                  src={songData.coverImage} 
                  alt="Album Cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 19.9 1.079-12.948a.75.75 0 0 1 1.498 0L12.64 19.9m-9.663-7.14 18.001 1.503a.75.75 0 1 0 .124-1.495L3.102 11.26a.75.75 0 0 0-.125 1.495Zm3.024-4.248 11.954-1.02a.75.75 0 0 1 .128 1.495L6.233 9.53a.75.75 0 0 1-.128-1.495Z" />
                  </svg>
                </div>
              )}
            </div>
          </header>

          <main className={`flex-grow ${layoutSettings.textSize} ${layoutSettings.lineHeight} ${layoutSettings.tracking} font-sans text-gray-800 ${layoutSettings.columnCount} ${layoutSettings.colGap}`}>
             {result.lines.map((line, idx) => (
                <p key={idx} className="mb-3 break-inside-avoid">
                  {line === '' ? '\u00A0' : line}
                </p>
             ))}
          </main>
          
        </div>
        
        <p className="mt-8 text-gray-500 text-sm print:hidden">
          Tip: Set margins to "None" or "Default" in your printer settings.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white">
          <h1 className="font-serif text-3xl font-bold mb-2">LyricCloze Gen</h1>
          <p className="text-indigo-100">Create beautiful listening worksheets in seconds.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Song Title</label>
              <input
                type="text"
                name="title"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="e.g. Yesterday"
                value={songData.title}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Artist</label>
              <input
                type="text"
                name="artist"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="e.g. The Beatles"
                value={songData.artist}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lyrics</label>
            <textarea
              name="originalLyrics"
              required
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition font-mono text-sm"
              placeholder="Paste the full lyrics here..."
              value={songData.originalLyrics}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Art (Optional)</label>
            <div 
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-1 text-center">
                {songData.coverImage ? (
                   <div className="relative w-32 h-32 mx-auto">
                     <img src={songData.coverImage} alt="Preview" className="w-full h-full object-cover rounded-md shadow-sm" />
                     <button 
                       type="button"
                       onClick={(e) => { e.stopPropagation(); setSongData(p => ({...p, coverImage: null}))}}
                       className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                       </svg>
                     </button>
                   </div>
                ) : (
                  <>
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <span className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span>Upload a file</span>
                        <input 
                          ref={fileInputRef}
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={appState === AppState.GENERATING}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              appState === AppState.GENERATING ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {appState === AppState.GENERATING ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Worksheet...
              </span>
            ) : (
              'Generate Worksheet'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;