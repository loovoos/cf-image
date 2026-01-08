"use client";
import { useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react"
import Image from "next/image";
import { faFolder, faUpload, faTrashAlt, faTimes, faCopy } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { useEffect } from 'react';
import Footer from '@/components/Footer'
import Link from "next/link";
import LoadingOverlay from "@/components/LoadingOverlay";


export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [Total, setTotal] = useState('?');
  const [selectedOption, setSelectedOption] = useState('tgchannel');
  const [isAuthapi, setisAuthapi] = useState(false);
  const [Loginuser, setLoginuser] = useState('');
  const [showSelector, setShowSelector] = useState(false);

  const fileInputRef = useRef(null);
  const parentRef = useRef(null);

  useEffect(() => {
    getTotal();
    isAuth();
  }, []);

  const isAuth = async () => {
    try {
      const res = await fetch(`/api/enableauthapi/isauth`, {
        method: "GET",
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        // 只有当 role 有值时才算真正登录
        if (data.role) {
          setisAuthapi(true);
          setLoginuser(data.role);
        } else {
          setisAuthapi(false);
        }
      } else {
        setisAuthapi(false);
      }
    } catch (error) {
      console.error('请求出错:', error);
      setisAuthapi(false);
    }
  };

  const getTotal = async () => {
    try {
      const res = await fetch(`/api/total`, {
        method: "GET",
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setTotal(data.total);
    } catch (error) {
      console.error('请求出错:', error);
    }
  };

  const handleFileChange = (event) => {
    const newFiles = event.target.files;
    const filteredFiles = Array.from(newFiles).filter(file =>
      !selectedFiles.find(selFile => selFile.name === file.name));
    const uniqueFiles = filteredFiles.filter(file =>
      !uploadedImages.find(upImg => upImg.name === file.name)
    );
    setSelectedFiles([...selectedFiles, ...uniqueFiles]);
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setUploadedImages([]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请选择要上传的文件');
      return;
    }

    setUploading(true);
    let successCount = 0;

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const targetUrl = selectedOption === "tgchannel" || selectedOption === "r2"
            ? `/api/enableauthapi/${selectedOption}`
            : `/api/${selectedOption}`;

          const response = await fetch(targetUrl, {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            file.url = result.url;
            setUploadedImages((prevImages) => [...prevImages, file]);
            setSelectedFiles((prevFiles) => prevFiles.filter(f => f !== file));
            successCount++;
          } else {
            const errorData = await response.json().catch(() => ({}));
            toast.error(errorData.message || `上传 ${file.name} 失败`);
          }
        } catch (error) {
          toast.error(`上传 ${file.name} 失败`);
        }
      }

      if (successCount > 0) {
        toast.success(`成功上传 ${successCount} 张图片`);
      }
    } catch (error) {
      toast.error('上传错误');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (event) => {
    const clipboardItems = event.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.kind === 'file' && item.type.includes('image')) {
        const file = item.getAsFile();
        setSelectedFiles(prev => [...prev, file]);
        break;
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const filteredFiles = Array.from(files).filter(file =>
        !selectedFiles.find(selFile => selFile.name === file.name));
      setSelectedFiles([...selectedFiles, ...filteredFiles]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('链接已复制');
    } catch (err) {
      toast.error('复制失败');
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const storageOptions = [
    { value: 'tgchannel', label: 'TG Channel' },
    { value: 'r2', label: 'R2 存储' },
  ];

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      <ToastContainer position="top-center" />
      <LoadingOverlay loading={uploading} />

      {/* 主容器 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* 头部 */}
          <div className="relative flex items-center justify-center py-5 border-b border-gray-100">
            <h1 className="text-xl font-semibold text-gray-800">图片上传</h1>

            {/* 选择接口按钮 */}
            <div className="absolute right-4">
              <button
                onClick={() => setShowSelector(!showSelector)}
                className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-medium rounded-full hover:from-orange-500 hover:to-orange-600 transition-all shadow-md"
              >
                选择接口
              </button>

              {/* 下拉菜单 */}
              {showSelector && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                  {storageOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSelectedOption(opt.value);
                        setShowSelector(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${selectedOption === opt.value ? 'text-orange-500 font-medium' : 'text-gray-700'
                        }`}
                    >
                      {opt.label}
                      {selectedOption === opt.value && ' ✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 登录/管理按钮 */}
            <div className="absolute left-4">
              {!isAuthapi ? (
                <Link href="/login" className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white text-sm font-medium rounded-full hover:from-blue-500 hover:to-blue-600 transition-all shadow-md">
                  登录
                </Link>
              ) : Loginuser === 'admin' ? (
                <Link href="/admin" className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white text-sm font-medium rounded-full hover:from-purple-500 hover:to-purple-600 transition-all shadow-md">
                  管理
                </Link>
              ) : (
                <button onClick={handleSignOut} className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm font-medium rounded-full hover:from-gray-500 hover:to-gray-600 transition-all shadow-md">
                  登出
                </button>
              )}
            </div>
          </div>

          {/* 上传区域 */}
          <div className="p-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onPaste={handlePaste}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all duration-300 min-h-[240px] flex flex-col items-center justify-center"
            >
              {selectedFiles.length === 0 ? (
                <>
                  {/* 文件夹图标 */}
                  <div className="mb-4">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 16C8 13.7909 9.79086 12 12 12H24L28 16H52C54.2091 16 56 17.7909 56 20V48C56 50.2091 54.2091 52 52 52H12C9.79086 52 8 50.2091 8 48V16Z" fill="#FFD54F" />
                      <path d="M8 20C8 17.7909 9.79086 16 12 16H52C54.2091 16 56 17.7909 56 20V48C56 50.2091 54.2091 52 52 52H12C9.79086 52 8 50.2091 8 48V20Z" fill="#FFECB3" />
                      <path d="M8 24H56V48C56 50.2091 54.2091 52 52 52H12C9.79086 52 8 50.2091 8 48V24Z" fill="#FFE082" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">
                    点击选择文件，或拖拽/粘贴图片到此处
                  </p>
                </>
              ) : (
                <div className="w-full">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                          {file.type.startsWith('image/') ? (
                            <Image
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 p-2 text-center">
                              {file.name}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                        >
                          <FontAwesomeIcon icon={faTimes} className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-gray-400 mt-4">
                    已选择 {selectedFiles.length} 个文件，点击继续添加
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*"
              />
            </div>
          </div>

          {/* 按钮区域 */}
          <div className="px-6 pb-6 space-y-3">
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className={`w-full py-3 rounded-lg text-white font-medium transition-all duration-300 ${uploading || selectedFiles.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 shadow-md hover:shadow-lg'
                }`}
            >
              {uploading ? '上传中...' : '上传图片'}
            </button>

            <button
              onClick={handleClear}
              className="w-full py-3 rounded-lg border-2 border-gray-200 text-gray-600 font-medium hover:border-gray-300 hover:bg-gray-50 transition-all duration-300"
            >
              清除缓存
            </button>
          </div>

          {/* 统计信息 */}
          <div className="px-6 pb-4 text-center text-xs text-gray-400">
            本站已托管 <span className="text-orange-500 font-medium">{Total}</span> 张图片
          </div>
        </div>
      </div>

      {/* 已上传图片列表 */}
      {uploadedImages.length > 0 && (
        <div className="w-full max-w-2xl mx-auto px-4 pb-20">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">上传成功</h2>
            <div className="space-y-3">
              {uploadedImages.map((file, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    {file.type.startsWith('image/') ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs">
                        文件
                      </div>
                    )}
                  </div>
                  <input
                    readOnly
                    value={file.url}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
                  />
                  <button
                    onClick={() => handleCopy(file.url)}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors flex-shrink-0"
                  >
                    <FontAwesomeIcon icon={faCopy} className="mr-1" />
                    复制
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 底部 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-200 py-3">
        <Footer />
      </div>
    </main>
  );
}