import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Image, MessageSquarePlus, MessageSquareWarning, Send, Trash2, X } from 'lucide-react';
import { complaintAPI } from '../services/api';
import { TableSkeleton } from '../components/Skeletons';

const fullDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const getComplaintImages = (complaint) => Array.isArray(complaint.complaint_image_urls) && complaint.complaint_image_urls.length
  ? complaint.complaint_image_urls
  : Array.isArray(complaint.complaint_images) ? complaint.complaint_images : [];

const ResidentComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ title: '', description: '' });
  const [selectedImages, setSelectedImages] = useState([]);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [viewingComplaint, setViewingComplaint] = useState(null);
  const [deletingComplaint, setDeletingComplaint] = useState(null);
  const [reopeningComplaint, setReopeningComplaint] = useState(null);
  const [reopenComment, setReopenComment] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  
  const videoRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadComplaints = useCallback(async () => {
    try {
      const { data } = await complaintAPI.getUserComplaints();
      setComplaints(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      notify('Could not load complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      setWebcamStream(stream);
      setShowWebcam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      notify('Webcam access not available, falling back to gallery upload');
      if (galleryInputRef.current) {
        galleryInputRef.current.click();
      }
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setShowWebcam(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg');

    const sizeEstimate = Math.round((dataUrl.length * 3) / 4);
    const capturedImg = {
      name: `captured_photo_${Date.now()}.jpeg`,
      size: sizeEstimate,
      preview: dataUrl
    };

    if (selectedImages.length >= MAX_IMAGES) {
      notify('You can upload maximum 3 images');
      stopWebcam();
      return;
    }

    setSelectedImages((current) => [...current, capturedImg]);
    stopWebcam();
  };

  const handleTakePhotoClick = () => {
    if (selectedImages.length >= MAX_IMAGES) {
      return notify('You can upload maximum 3 images');
    }
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    } else {
      startWebcam();
    }
  };

  const resetForm = () => {
    stopWebcam();
    setForm({ title: '', description: '' });
    setSelectedImages([]);
    setShowForm(false);
  };

  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (selectedImages.length + files.length > MAX_IMAGES) return notify('You can upload maximum 3 images');

    try {
      const previews = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        if (!ALLOWED_TYPES.includes(file.type)) return reject(new Error('Only JPG, JPEG, and PNG images are allowed'));
        if (file.size > MAX_IMAGE_SIZE) return reject(new Error('Each image must be 5 MB or smaller'));
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, size: file.size, preview: reader.result });
        reader.onerror = () => reject(new Error('Could not read selected image'));
        reader.readAsDataURL(file);
      })));
      setSelectedImages((current) => [...current, ...previews]);
    } catch (error) {
      notify(error.message || 'Invalid image selected');
    }
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    try {
      await complaintAPI.create({ ...form, images: selectedImages.map((item) => item.preview) });
      resetForm();
      notify('Complaint submitted');
      loadComplaints();
    } catch (error) {
      notify(error.response?.data?.message || 'Could not submit complaint');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingComplaint) return;
    try {
      await complaintAPI.delete(deletingComplaint.id);
      notify('Complaint deleted successfully.');
      setComplaints((current) => current.filter((item) => item.id !== deletingComplaint.id));
      setDeletingComplaint(null);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to delete complaint. Please try again.';
      notify(errMsg);
      setDeletingComplaint(null);
    }
  };

  const handleConfirmResolved = async (id) => {
    try {
      const { data } = await complaintAPI.confirmResolved(id);
      notify(data.message || 'Thank you. Your complaint has been closed successfully.');
      loadComplaints();
      if (viewingComplaint?.id === id) {
        setViewingComplaint(null);
      }
    } catch (error) {
      notify(error.response?.data?.message || 'Failed to confirm resolution.');
    }
  };

  const handleReopenSubmit = async (event) => {
    event.preventDefault();
    if (!reopeningComplaint) return;
    try {
      const { data } = await complaintAPI.reopen(reopeningComplaint.id, { comment: reopenComment });
      notify(data.message || 'Your complaint has been reopened and the admin has been notified.');
      setReopeningComplaint(null);
      setReopenComment('');
      loadComplaints();
      if (viewingComplaint?.id === reopeningComplaint.id) {
        setViewingComplaint(null);
      }
    } catch (error) {
      notify(error.response?.data?.message || 'Failed to reopen complaint.');
    }
  };

  const filteredComplaints = complaints.filter((item) => {
    if (activeTab === 'history') {
      return item.status === 'closed';
    }
    return item.status !== 'closed';
  });

  return (
    <div className="portal-module">
      {toast && <div className="resident-toast">{toast}</div>}
      <div className="portal-page-title">
        <div>
          <h1>Complaints</h1>
          <p>Raise a new complaint and track your requests.</p>
        </div>
        <button className="portal-primary-btn" onClick={() => setShowForm(true)}>
          <MessageSquarePlus size={16} /> Raise Complaint
        </button>
      </div>

      {/* Tabs */}
      <div className="portal-tabs" style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button 
          className={`portal-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          style={{ 
            padding: '10px 14px', 
            border: 'none', 
            background: 'none', 
            fontWeight: '700', 
            fontSize: '13px', 
            cursor: 'pointer', 
            color: activeTab === 'active' ? '#087d40' : '#64748b', 
            borderBottom: activeTab === 'active' ? '2px solid #087d40' : 'none' 
          }}
          onClick={() => setActiveTab('active')}
        >
          Active Complaints
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          style={{ 
            padding: '10px 14px', 
            border: 'none', 
            background: 'none', 
            fontWeight: '700', 
            fontSize: '13px', 
            cursor: 'pointer', 
            color: activeTab === 'history' ? '#087d40' : '#64748b', 
            borderBottom: activeTab === 'history' ? '2px solid #087d40' : 'none' 
          }}
          onClick={() => setActiveTab('history')}
        >
          Complaint History
        </button>
      </div>

      <section className="portal-panel portal-table-card">
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filteredComplaints.length ? (
          <div className="portal-table-wrap">
            <table className="portal-data-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Status</th>
                  <th>Reply</th>
                  <th>Photos</th>
                  <th>Date</th>
                  <th style={{ width: '220px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((item) => {
                  const isPending = item.status === 'pending';
                  const isResolved = item.status === 'resolved';
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.title}</strong><div className="portal-muted-text">{item.description}</div></td>
                      <td><span className={`portal-status ${item.status}`}>{String(item.status).replace('_', ' ')}</span></td>
                      <td>{item.reply || '—'}</td>
                      <td>
                        {getComplaintImages(item).length ? (
                          <button className="portal-link-button" onClick={() => setViewingPhoto({ title: item.title, images: getComplaintImages(item), index: 0 })}>
                            <Image size={13} /> View Photo
                          </button>
                        ) : (
                          <span className="portal-muted-text">-</span>
                        )}
                      </td>
                      <td>{fullDate(item.created_at)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="resident-bill-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                          <button 
                            className="portal-link-button" 
                            style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px 6px' }}
                            onClick={() => setViewingComplaint(item)}
                          >
                            <Eye size={12} /> View
                          </button>
                          {isPending && (
                            <button 
                              className="portal-link-button" 
                              style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px 6px', color: '#dc2626' }}
                              onClick={() => setDeletingComplaint(item)}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                          {isResolved && (
                            <>
                              <button 
                                className="portal-link-button" 
                                style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px 6px', color: '#087d40' }}
                                onClick={() => handleConfirmResolved(item.id)}
                              >
                                Confirm
                              </button>
                              <button 
                                className="portal-link-button" 
                                style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px 6px', color: '#dd6b20' }}
                                onClick={() => setReopeningComplaint(item)}
                              >
                                Reopen
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="portal-empty">
            <MessageSquareWarning size={26} /><br />
            {activeTab === 'history' ? 'No closed complaints in history.' : 'No active complaints raised yet.'}
          </div>
        )}
      </section>

      {showForm && (
        <div className="portal-modal-backdrop" onMouseDown={resetForm}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div><h3>Raise a complaint</h3><p>Tell the society team what needs attention.</p></div>
              <button type="button" onClick={resetForm}>×</button>
            </div>
            <form className="portal-form" onSubmit={submitComplaint}>
              {!showWebcam ? (
                <>
                  <label className="portal-field-full">
                    Subject
                    <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                  </label>
                  <label className="portal-field-full">
                    Description
                    <textarea required rows="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                  </label>
                  
                  <div className="portal-field-full">
                    <span className="block text-sm font-bold text-slate-700 mb-2">Photos (optional, up to 3 JPG/PNG images, 5 MB each)</span>
                    
                    {selectedImages.length < MAX_IMAGES && (
                      <div className="grid grid-cols-2 gap-3 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={handleTakePhotoClick}
                          className="flex flex-col items-center justify-center border border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-3 bg-blue-50/20 hover:bg-blue-50/40 transition cursor-pointer text-slate-700 font-semibold gap-1.5"
                          style={{ minHeight: '70px', background: '#eff6ff33', border: '1px dashed #93c5fd', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '18px' }}>📷</span>
                          <span style={{ fontSize: '12px' }}>Take Photo</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                          className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-3 bg-slate-50 hover:bg-slate-100/80 transition cursor-pointer text-slate-700 font-semibold gap-1.5"
                          style={{ minHeight: '70px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '18px' }}>🖼️</span>
                          <span style={{ fontSize: '12px' }}>Choose from Gallery</span>
                        </button>
                      </div>
                    )}
                    
                    <input 
                      type="file" 
                      ref={galleryInputRef} 
                      accept="image/jpeg,image/jpg,image/png" 
                      multiple 
                      style={{ display: 'none' }} 
                      onChange={handleImageSelect} 
                    />
                    <input 
                      type="file" 
                      ref={cameraInputRef} 
                      accept="image/jpeg,image/jpg,image/png" 
                      capture="environment" 
                      style={{ display: 'none' }} 
                      onChange={handleImageSelect} 
                    />
                  </div>

                  {selectedImages.length > 0 && (
                    <div className="portal-field-full grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                      {selectedImages.map((image, index) => (
                        <div key={`${image.name}-${index}`} className="relative rounded-xl border border-slate-200 bg-slate-50 p-2" style={{ position: 'relative', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                          <img src={image.preview} alt={image.name} className="h-28 w-full rounded-lg object-cover" style={{ height: '90px', width: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                          <button
                            type="button"
                            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-red-600 shadow"
                            onClick={() => setSelectedImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            aria-label="Remove selected image"
                            style={{ position: 'absolute', top: '12px', right: '12px', display: 'grid', placeItems: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'white', border: 'none', color: '#dc2626', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                          <span className="mt-1 block truncate text-[10px] font-bold text-slate-700" style={{ fontSize: '10px', fontWeight: '700', color: '#334155', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginTop: '4px' }}>{image.name}</span>
                          <span className="block text-[9px] text-slate-500 font-semibold" style={{ fontSize: '9px', color: '#64748b', display: 'block', fontWeight: '600' }}>{formatSize(image.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="portal-form-actions">
                    <button type="button" className="portal-light-btn" onClick={resetForm}>Cancel</button>
                    <button className="portal-primary-btn"><Send size={15} /> Submit Complaint</button>
                  </div>
                </>
              ) : (
                <div className="portal-field-full flex flex-col items-center justify-center bg-slate-900 rounded-xl p-3 text-white relative" style={{ background: '#0f172a', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-inner">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="flex gap-3 mt-3 w-full max-w-sm" style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="portal-primary-btn flex-1 flex items-center justify-center"
                      style={{ padding: '8px 16px', background: '#059669', borderColor: '#059669', flex: 1, cursor: 'pointer' }}
                    >
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="portal-light-btn flex-1 flex items-center justify-center"
                      style={{ padding: '8px 16px', background: 'white', color: '#1e293b', flex: 1, cursor: 'pointer' }}
                    >
                      Close Camera
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {viewingComplaint && (
        <div className="portal-modal-backdrop" onMouseDown={() => setViewingComplaint(null)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div>
                <h3>Complaint Details</h3>
                <p>Status: <span className={`portal-status ${viewingComplaint.status}`} style={{ display: 'inline-block', marginLeft: '6px' }}>{String(viewingComplaint.status).replace('_', ' ')}</span></p>
              </div>
              <button type="button" onClick={() => setViewingComplaint(null)}>×</button>
            </div>
            <div className="portal-form" style={{ padding: '18px 20px 20px', display: 'grid', gap: 14 }}>
              <div className="portal-field-full">
                <strong>Subject</strong>
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b' }}>{viewingComplaint.title}</p>
              </div>
              <div className="portal-field-full">
                <strong>Description</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475467', whiteSpace: 'pre-wrap' }}>{viewingComplaint.description}</p>
              </div>
              <div className="portal-field-full">
                <strong>Admin Reply</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: viewingComplaint.reply ? '#1e293b' : '#94a3b8', fontStyle: viewingComplaint.reply ? 'normal' : 'italic' }}>
                  {viewingComplaint.reply || 'No reply from admin yet.'}
                </p>
              </div>
              {getComplaintImages(viewingComplaint).length > 0 && (
                <div className="portal-field-full">
                  <strong>Attached Photos</strong>
                  <div className="flex gap-2 mt-2" style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {getComplaintImages(viewingComplaint).map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt="Complaint proof" 
                        className="h-16 w-16 rounded-lg object-cover border border-slate-200 cursor-zoom-in" 
                        style={{ width: '64px', height: '64px', objectFit: 'cover', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                        onClick={() => setViewingPhoto({ title: viewingComplaint.title, images: getComplaintImages(viewingComplaint), index: idx })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline Info */}
              <div className="portal-field-full" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#1e293b' }}>Complaint Timeline</strong>
                <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#475467' }}>
                  <div>📅 <strong>Created:</strong> {fullDate(viewingComplaint.created_at)}</div>
                  {viewingComplaint.in_progress_at && <div>🔵 <strong>In Progress:</strong> {fullDate(viewingComplaint.in_progress_at)}</div>}
                  {viewingComplaint.resolved_at && <div>🟢 <strong>Resolved:</strong> {fullDate(viewingComplaint.resolved_at)}</div>}
                  {viewingComplaint.closed_at && <div>⚫ <strong>Closed:</strong> {fullDate(viewingComplaint.closed_at)}</div>}
                  {viewingComplaint.reopened_at && (
                    <div style={{ padding: '6px 8px', background: '#fff5e9', borderLeft: '3px solid #dd6b20', borderRadius: '4px' }}>
                      <div>⚠️ <strong>Reopened:</strong> {fullDate(viewingComplaint.reopened_at)}</div>
                      {viewingComplaint.reopened_comment && <div style={{ marginTop: '2px' }}><em>Comment: "{viewingComplaint.reopened_comment}"</em></div>}
                    </div>
                  )}
                </div>
              </div>

              <div className="portal-form-actions" style={{ justifyContent: 'flex-end', marginTop: 10, gap: '8px' }}>
                {viewingComplaint.status === 'resolved' && (
                  <>
                    <button 
                      type="button"
                      className="portal-primary-btn" 
                      style={{ background: '#087d40', borderColor: '#087d40' }}
                      onClick={() => handleConfirmResolved(viewingComplaint.id)}
                    >
                      Confirm Resolved
                    </button>
                    <button 
                      type="button"
                      className="portal-primary-btn" 
                      style={{ background: '#dd6b20', borderColor: '#dd6b20' }}
                      onClick={() => {
                        setReopeningComplaint(viewingComplaint);
                        setReopenComment('');
                      }}
                    >
                      Issue Still Exists
                    </button>
                  </>
                )}
                <button type="button" className="portal-light-btn" onClick={() => setViewingComplaint(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingComplaint && (
        <div className="portal-modal-backdrop" onMouseDown={() => setDeletingComplaint(null)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="portal-modal-head">
              <div>
                <h3>Delete Complaint</h3>
              </div>
              <button type="button" onClick={() => setDeletingComplaint(null)}>×</button>
            </div>
            <div className="portal-form" style={{ padding: '18px 20px 20px', display: 'grid', gap: 14 }}>
              <p style={{ fontSize: '14px', color: '#475467', margin: 0 }}>
                Are you sure you want to delete this complaint? This action cannot be undone.
              </p>
              <div className="portal-form-actions" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 10, display: 'flex' }}>
                <button type="button" className="portal-light-btn" onClick={() => setDeletingComplaint(null)}>Cancel</button>
                <button 
                  type="button" 
                  className="portal-primary-btn" 
                  style={{ background: '#dc2626', borderColor: '#dc2626', color: 'white' }}
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reopeningComplaint && (
        <div className="portal-modal-backdrop" onMouseDown={() => setReopeningComplaint(null)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="portal-modal-head">
              <div>
                <h3>Reopen Complaint</h3>
                <p>Describe the remaining issue below.</p>
              </div>
              <button type="button" onClick={() => setReopeningComplaint(null)}>×</button>
            </div>
            <form className="portal-form" onSubmit={handleReopenSubmit} style={{ padding: '18px 20px 20px', display: 'grid', gap: 14 }}>
              <label className="portal-field-full">
                Please describe the remaining issue (optional):
                <textarea 
                  rows="3"
                  placeholder="e.g. The leak was patched but it started dripping again."
                  value={reopenComment} 
                  onChange={(event) => setReopenComment(event.target.value)} 
                />
              </label>
              <div className="portal-form-actions" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <button type="button" className="portal-light-btn" onClick={() => setReopeningComplaint(null)}>Cancel</button>
                <button 
                  type="submit" 
                  className="portal-primary-btn" 
                  style={{ background: '#dd6b20', borderColor: '#dd6b20', color: 'white' }}
                >
                  Reopen Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingPhoto && (
        <div className="portal-modal-backdrop" onMouseDown={() => setViewingPhoto(null)}>
          <div className="portal-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="portal-modal-head">
              <div><h3>Complaint Photo</h3><p>{viewingPhoto.title}</p></div>
              <button type="button" onClick={() => setViewingPhoto(null)}>×</button>
            </div>
            <div className="p-4">
              <img src={viewingPhoto.images[viewingPhoto.index]} alt="Complaint proof" className="max-h-[70vh] w-full rounded-xl object-contain bg-slate-50" />
              {viewingPhoto.images.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewingPhoto.images.map((image, index) => (
                    <button key={image} type="button" className={`rounded-lg border px-3 py-2 text-xs font-bold ${index === viewingPhoto.index ? 'border-blue-500 text-blue-700' : 'border-slate-200 text-slate-600'}`} onClick={() => setViewingPhoto({ ...viewingPhoto, index })}>
                      Photo {index + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentComplaints;
