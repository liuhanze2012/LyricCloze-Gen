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

  // Calculate layout settings based on line count to fit A4 harmoniously
  const layoutSettings = useMemo(() => {
    if (!result) return null;
    const lineCount = result.lines.length;

    // Base configuration extended with typography details
    let settings = {
      titleSize: 'text-4xl',
      artistSize: 'text-xl',
      imageSize: 'w-32 h-32',
      headerMb: 'mb-8',
      textSize: 'text-base',
      lineHeight: 'leading-normal',
      tracking: 'tracking-normal', // Letter spacing
      colGap: 'gap-12',
      columnCount: 'columns-1 md:columns-2 print:columns-2', // Default to 2 cols for print
      padding: 'p-[20mm]',
    };

    // Intelligent Layout & Typography Logic
    // Adjusted thresholds to be more conservative to prevent 2-page overflows
    if (lineCount > 75) {
      // Ultra Dense (Very long songs)
      settings = {
        ...settings,
        textSize: 'text-[9px]', // Reduced from 10px
        lineHeight: 'leading-[1.3]',
        tracking: 'tracking-tighter',
        imageSize: 'w-14 h-14', // Smaller image
        titleSize: 'text-lg',
        artistSize: 'text-sm',
        headerMb: 'mb-2',
        padding: 'p-[10mm]',
        colGap: 'gap-4',
      };
    } else if (lineCount > 60) {
      // Dense
      settings = {
        ...settings,
        textSize: 'text-[11px]', // Reduced from xs(12px)
        lineHeight: 'leading-[1.5]',
        tracking: 'tracking-tight',
        imageSize: 'w-16 h-16',
        titleSize: 'text-xl',
        artistSize: 'text-base',
        headerMb: 'mb-3',
        padding: 'p-[12mm]',
        colGap: 'gap-5',
      };
    } else if (lineCount > 50) {
      // Compact
      settings = {
        ...settings,
        textSize: 'text-xs', // 12px
        lineHeight: 'leading-relaxed', 
        tracking: 'tracking-normal',
        imageSize: 'w-20 h-20',
        titleSize: 'text-2xl',
        headerMb: 'mb-5',
        padding: 'p-[15mm]',
        colGap: 'gap-8',
      };
    } else if (lineCount > 35) {
      // Balanced / Normal
      settings = {
        ...settings,
        textSize: 'text-sm', // 14px
        lineHeight: 'leading-[2.0]', 
        tracking: 'tracking-wide', 
        imageSize: 'w-24 h-24',
        titleSize: 'text-3xl',
        headerMb: 'mb-6',
        padding: 'p-[18mm]',
        colGap: 'gap-10',
      };
    } else if (lineCount > 22) {
      // Spacious
      settings = {
        ...settings,
        textSize: 'text-base', // 16px
        lineHeight: 'leading-[2.5]', 
        tracking: 'tracking-wider',
        imageSize: 'w-32 h-32',
        titleSize: 'text-4xl',
        headerMb: 'mb-8',
        padding: 'p-[20mm]',
        colGap: 'gap-12',
      };
    } else {
      // Very Short - Center Single Column
      settings = {
        ...settings,
        textSize: 'text-xl',
        lineHeight: 'leading-[3]', 
        tracking: 'tracking-widest',
        imageSize: 'w-40 h-40',
        titleSize: 'text-5xl',
        artistSize: 'text-3xl',
        headerMb: 'mb-12',
        padding: 'p-[25mm]',
        columnCount: 'columns-1 max-w-3xl mx-auto print:columns-1', 
        colGap: 'gap-0',
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
      // 1. Font Size - Tweak down slightly for Word to ensure single page fit
      const sizeMap: Record<string, string> = {
        'text-[9px]': '7pt',
        'text-[10px]': '7.5pt',
        'text-[11px]': '8pt',
        'text-xs': '9pt',
        'text-sm': '10pt',     // Slightly smaller than typical conversion
        'text-base': '11pt',   // Standard doc size
        'text-lg': '12pt',
        'text-xl': '14pt',
        'text-2xl': '16pt',
        'text-3xl': '20pt',
        'text-4xl': '24pt',
        'text-5xl': '32pt',
      };
      const fontSize = sizeMap[settings.textSize] || '11pt';
      const titleSize = sizeMap[settings.titleSize] || '22pt';
      const artistSize = sizeMap[settings.artistSize] || '12pt';

      // 2. Line Height - Use % for better control in Word
      let lineHeight = '120%'; 
      if (settings.lineHeight.includes('[')) {
        // extract raw number
        const val = parseFloat(settings.lineHeight.match(/\[(.*?)\]/)[1]);
        // Convert raw multiplier to percentage for Word (usually slightly tighter than web)
        lineHeight = `${Math.floor(val * 100 * 0.9)}%`; 
      } else {
        const lhMap: Record<string, string> = {
          'leading-normal': '120%',
          'leading-relaxed': '140%',
          'leading-loose': '180%',
        };
        lineHeight = lhMap[settings.lineHeight] || '120%';
      }

      // 3. Letter Spacing
      const trackMap: Record<string, string> = {
        'tracking-tighter': '-0.05em',
        'tracking-tight': '-0.025em',
        'tracking-normal': '0',
        'tracking-wide': '0.05em', 
        'tracking-wider': '0.1em',
        'tracking-widest': '0.2em',
      };
      const letterSpacing = trackMap[settings.tracking] || '0';

      // 4. Page Margins
      const margin = settings.padding.match(/\[(.*?)\]/)?.[1] || '20mm';

      // 5. Columns
      const cols = settings.columnCount.includes('columns-2') ? 2 : 1;
      
      // Map Gap
      let colGap = '0.5in';
      if (settings.colGap === 'gap-4') colGap = '0.15in';
      if (settings.colGap === 'gap-5') colGap = '0.2in';
      if (settings.colGap === 'gap-6') colGap = '0.25in';
      if (settings.colGap === 'gap-8') colGap = '0.35in';
      if (settings.colGap === 'gap-10') colGap = '0.4in';
      if (settings.colGap === 'gap-12') colGap = '0.5in';

      // 6. Image Size
      const imgMap: Record<string, string> = {
        'w-14 h-14': '56px',
        'w-16 h-16': '64px',
        'w-20 h-20': '80px',
        'w-24 h-24': '96px',
        'w-28 h-28': '112px',
        'w-32 h-32': '128px',
        'w-36 h-36': '144px',
        'w-40 h-40': '160px',
      };
      const imgDim = imgMap[settings.imageSize] || '128px';

      return { fontSize, titleSize, artistSize, lineHeight, letterSpacing, margin, cols, colGap, imgDim };
    };

    const styles = getWordStyles(layoutSettings);
    const imgInt = parseInt(styles.imgDim); // Integer for width/height attributes

    // HTML Content for Word
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${songData.title} - Cloze Worksheet</title>
        <style>
          /* Page Layout */
          @page Section1 {
            size: 595.3pt 841.9pt; /* A4 Size */
            margin: ${styles.margin} ${styles.margin} ${styles.margin} ${styles.margin};
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-paper-source: 0;
            ${styles.cols > 1 ? `mso-columns: ${styles.cols} even ${styles.colGap};` : ''}
          }
          
          div.Section1 { page: Section1; }
          
          /* Global Typography */
          body { 
            font-family: 'Calibri', 'Arial', sans-serif; 
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            letter-spacing: ${styles.letterSpacing};
            color: #000000;
          }
          
          /* Header Styling */
          table.header { width: 100%; border-bottom: 1.5pt solid #eeeeee; margin-bottom: 12pt; padding-bottom: 6pt; }
          h1 { font-size: ${styles.titleSize}; font-weight: bold; margin: 0; color: #111827; }
          h2 { font-size: ${styles.artistSize}; font-weight: normal; margin: 2pt 0; color: #4B5563; }
          
          .badge { 
            font-size: 8pt; 
            text-transform: uppercase; 
            color: #6B7280; 
            background: #F3F4F6; 
            padding: 2pt 4pt;
            border: 1pt solid #E5E7EB;
            display: inline-block;
          }

          /* Image - width/height attributes are crucial for Word to render Base64 correctly */
          img.cover { 
            width: ${styles.imgDim}; 
            height: ${styles.imgDim}; 
            border: 1pt solid #E5E7EB; 
            object-fit: cover; 
          }

          /* Lyrics Styling */
          p { margin: 0; }
          .lyric-line { margin-bottom: 0; }
        </style>
      </head>
      <body>
        <div class=Section1>
          <!-- Header -->
          <table class="header">
            <tr>
              <td valign="top">
                <h1>${songData.title || "Untitled Song"}</h1>
                <h2>${songData.artist || "Unknown Artist"}</h2>
                <span class="badge">Listening Cloze Exercise</span>
              </td>
              <td valign="top" align="right" width="${imgInt + 20}">
                ${songData.coverImage 
                  ? `<img src="${songData.coverImage}" class="cover" width="${imgInt}" height="${imgInt}" alt="Cover" />` 
                  : ''}
              </td>
            </tr>
          </table>

          <!-- Lyrics Content -->
          ${result.lines.map(line => `<p class="lyric-line">${line === '' ? '&nbsp;' : line}</p>`).join('')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', content], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `${songData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'worksheet'}_cloze.doc`;
    link.download = filename;
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
        {/* Toolbar - Hidden when printing */}
        <div className="w-full max-w-[210mm] mb-6 flex flex-col sm:flex-row justify-between items-center px-4 gap-4 print:hidden">
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded shadow hover:bg-gray-700 transition flex items-center gap-2"
          >
            <span>←</span> Edit / New
          </button>
          <div className="flex gap-3">
             <button 
              onClick={handleExportWord}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded shadow hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Export to Word
            </button>
             <button 
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded shadow hover:bg-blue-700 transition flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
              </svg>
              Print to PDF
            </button>
          </div>
        </div>

        {/* A4 Page Preview - Dynamic Styles Applied */}
        <div className={`bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] ${layoutSettings.padding} flex flex-col relative mx-auto print:mx-0 print:w-full print:h-auto`}>
          {/* Header */}
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

          {/* Lyrics Content */}
          {/* Use flex-grow to fill space if needed, but columns layout is main driver */}
          <main className={`flex-grow ${layoutSettings.textSize} ${layoutSettings.lineHeight} ${layoutSettings.tracking} font-sans text-gray-800 ${layoutSettings.columnCount} ${layoutSettings.colGap}`}>
             {result.lines.map((line, idx) => (
                <p key={idx} className="mb-0 break-inside-avoid">
                  {/* Add a non-breaking space if line is empty to maintain height */}
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