import { useState, useCallback, useEffect, useRef } from 'react';
import { useResume } from '../../hooks';
import { Button, useToast } from '../../components/common';
import type { ATSScoreResponse } from '../../types';
import styles from './ResumeManager.module.css';

export function ResumeManager() {
  const { resume, fetchResume, uploadResume, deleteResume, getATSScore, tailorBullets } = useResume();
  const { toast } = useToast();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [atsScore, setAtsScore] = useState<ATSScoreResponse | null>(null);
  const [atsJobDescription, setAtsJobDescription] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [tailoredBullets, setTailoredBullets] = useState<string[] | null>(null);
  const [tailorJobDescription, setTailorJobDescription] = useState('');
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailoringStage, setTailoringStage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'ats' | 'tailor'>('upload');
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const jdCharCount = tailorJobDescription.length;
  const canTailor = tailorJobDescription.trim().length > 0;

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({ type: 'error', title: 'Invalid file type', message: 'Please upload a PDF or DOCX file.' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ type: 'error', title: 'File too large', message: 'Maximum file size is 5 MB.' });
        return;
      }
      setSelectedFile(file);
      setIsUploadOpen(true);
    }
    // Clear the input so same file can be selected again
    e.target.value = '';
  }, [toast]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const result = await uploadResume(selectedFile);
      if (result.success && result.resume) {
        toast({ type: 'success', title: 'Resume uploaded', message: `${result.resume.original_filename} uploaded successfully` });
        setIsUploadOpen(false);
        setSelectedFile(null);
      } else {
        toast({ type: 'error', title: 'Upload failed', message: result.error });
      }
    } catch (err) {
      const error = err as { message?: string };
      toast({ type: 'error', title: 'Upload failed', message: error.message });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, uploadResume, toast]);

  const handleDelete = useCallback(async () => {
    if (!resume) return;
    try {
      await deleteResume();
      toast({ type: 'success', title: 'Resume deleted' });
    } catch (err) {
      const error = err as { message?: string };
      toast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  }, [resume, deleteResume, toast]);

  const handleATSScore = useCallback(async () => {
    if (!atsJobDescription.trim()) {
      toast({ type: 'error', title: 'Missing job description', message: 'Please paste a job description to score against.' });
      return;
    }
    setIsScoring(true);
    try {
      const result = await getATSScore(atsJobDescription);
      if (result.success && result.data) {
        setAtsScore(result.data);
        toast({ type: 'success', title: 'ATS Score calculated', message: `Match score: ${result.data.match_score}/100` });
      } else {
        toast({ type: 'error', title: 'Scoring failed', message: result.error });
      }
    } catch (err) {
      const error = err as { message?: string };
      toast({ type: 'error', title: 'Scoring failed', message: error.message });
    } finally {
      setIsScoring(false);
    }
  }, [atsJobDescription, getATSScore, toast]);

  const handleTailorBullets = useCallback(async () => {
    if (!tailorJobDescription.trim()) {
      toast({ type: 'error', title: 'Missing job description', message: 'Please paste a job description.' });
      return;
    }
    setIsTailoring(true);
    setTailoringStage('Generating bullets from your resume...');
    try {
      const result = await tailorBullets(tailorJobDescription);
      if (result.success && result.data) {
        setTailoredBullets(result.data.bullets);
        setTailoringStage('');
        toast({ type: 'success', title: 'Bullets tailored', message: `Generated ${result.data.bullets.length} bullet(s) from your resume.` });
      } else {
        setTailoringStage('');
        toast({ type: 'error', title: 'Tailoring failed', message: result.error });
      }
    } catch (err) {
      setTailoringStage('');
      const error = err as { message?: string };
      toast({ type: 'error', title: 'Tailoring failed', message: error.message });
    } finally {
      setIsTailoring(false);
    }
  }, [tailorJobDescription, tailorBullets, toast]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyAllTailored = useCallback(() => {
    if (!tailoredBullets) return;
    const text = tailoredBullets.join('\n');
    navigator.clipboard.writeText(text);
    toast({ type: 'success', title: 'Copied', message: `${tailoredBullets.length} bullet(s) copied to clipboard.` });
  }, [tailoredBullets, toast]);

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'upload' ? styles.active : ''}`} onClick={() => setActiveTab('upload')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Resume
        </button>
        <button className={`${styles.tab} ${activeTab === 'ats' ? styles.active : ''}`} onClick={() => setActiveTab('ats')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          ATS Score
        </button>
        <button className={`${styles.tab} ${activeTab === 'tailor' ? styles.active : ''}`} onClick={() => setActiveTab('tailor')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
          Tailor Bullets
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className={styles.tabContent}>
          {resume && resume.id ? (
            <div className={styles.resumeCard}>
              <div className={styles.resumeInfo}>
                <div className={styles.resumeIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className={styles.resumeDetails}>
                  <h4>{resume.original_filename}</h4>
                  <p>Uploaded {new Date(resume.uploaded_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className={styles.resumeActions}>
                <Button variant="secondary" onClick={() => replaceFileInputRef.current?.click()}>
                  Replace
                </Button>
                <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className={styles.fileInput} ref={replaceFileInputRef} />
                <Button variant="danger" onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.uploadPrompt}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className={styles.uploadIcon}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <h4>No resume uploaded</h4>
              <p>Upload your resume (PDF or DOCX, max 5MB) to enable ATS scoring and bullet tailoring.</p>
              <div className={styles.uploadButtonGroup}>
                <Button variant="primary" onClick={() => uploadFileInputRef.current?.click()}>
                  Upload Resume
                </Button>
                <input type="file" accept=".pdf,.docx" onChange={handleFileChange} className={styles.fileInput} ref={uploadFileInputRef} />
              </div>
            </div>
          )}

          {isUploadOpen && selectedFile && (
            <div className={styles.uploadForm}>
              <div className={styles.selectedFile}>
                <span>{selectedFile.name} ({formatFileSize(selectedFile.size)})</span>
                <div className={styles.uploadActions}>
                  <Button variant="secondary" onClick={() => { setSelectedFile(null); setIsUploadOpen(false); }}>Cancel</Button>
                  <Button variant="primary" onClick={handleUpload} isLoading={isUploading}>
                    {resume && resume.id ? 'Replace' : 'Upload'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ats' && (
        <div className={styles.tabContent}>
          {!resume ? (
            <div className={styles.emptyState}>
              <p>Upload a resume first to use ATS scoring.</p>
            </div>
          ) : (
            <>
              <div className={styles.section}>
                <label htmlFor="ats-job-desc">Job Description</label>
                <textarea
                  id="ats-job-desc"
                  value={atsJobDescription}
                  onChange={e => setAtsJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={6}
                  className={styles.textarea}
                />
                <Button variant="primary" onClick={handleATSScore} isLoading={isScoring} disabled={!atsJobDescription.trim()}>
                  Calculate ATS Score
                </Button>
              </div>

              {atsScore && (
                <div className={styles.scoreCard}>
                  <div className={styles.scoreCircle}>
                    <div className={styles.scoreRing} style={{ '--score': `${atsScore.match_score}` } as React.CSSProperties}>
                      <span className={styles.scoreValue}>{atsScore.match_score}</span>
                    </div>
                  </div>
                  <div className={styles.scoreBreakdown}>
                    <h4>Matched Keywords</h4>
                    <div className={styles.keywords}>
                      {atsScore.matched_keywords.length > 0 ? (
                        atsScore.matched_keywords.map((kw, i) => (
                          <span key={i} className={`${styles.keyword} ${styles.matched}`}>{kw}</span>
                        ))
                      ) : (
                        <span className={styles.noKeywords}>None</span>
                      )}
                    </div>
                    <h4>Missing Keywords</h4>
                    <div className={styles.keywords}>
                      {atsScore.missing_keywords.length > 0 ? (
                        atsScore.missing_keywords.map((kw, i) => (
                          <span key={i} className={`${styles.keyword} ${styles.missing}`}>{kw}</span>
                        ))
                      ) : (
                        <span className={styles.noKeywords}>None</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.summary}>
                    <h4>Summary</h4>
                    <p>{atsScore.summary}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'tailor' && (
        <div className={styles.tabContent}>
          {!resume ? (
            <div className={styles.emptyState}>
              <p>Upload a resume first to generate tailored bullet points.</p>
            </div>
          ) : (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <label htmlFor="tailor-job-desc">Target Job Description</label>
                  <span className={styles.charCount}>{jdCharCount} chars</span>
                </div>
                <p className={styles.hint}>
                  Bullet points are generated from your uploaded resume ({resume.original_filename}), tailored to this job description.
                </p>
                <textarea
                  id="tailor-job-desc"
                  value={tailorJobDescription}
                  onChange={e => setTailorJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  rows={8}
                  className={styles.textarea}
                />
              </div>

              <Button
                className={styles.generateButton}
                variant="primary"
                size="lg"
                onClick={handleTailorBullets}
                isLoading={isTailoring}
                disabled={!canTailor || isTailoring}
              >
                {isTailoring ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    {tailoringStage || 'Generating...'}
                  </>
                ) : (
                  'Generate Tailored Bullets'
                )}
              </Button>

              {tailoredBullets && (
                <div className={styles.results}>
                  <div className={styles.resultsHeader}>
                    <h4>Tailored Bullet Points</h4>
                  </div>
                  <ol className={styles.bulletList}>
                    {tailoredBullets.map((bullet, i) => (
                      <li key={i} className={styles.bulletItem}>{bullet}</li>
                    ))}
                    <li className={styles.copyAllRow}>
                      <Button variant="secondary" size="sm" onClick={copyAllTailored}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        Copy All
                      </Button>
                    </li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}