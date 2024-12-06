"use client";

import React, { useState } from "react";
import Link from "next/link";
import "../globals.css";
import "./upload.css";
import  post from "aws-amplify";

export default function UploadPage() {
  // const [uploadType, setUploadType] = useState<"url" | "zip">("zip"); // "zip" for ZIP file, "url" for URL
  const [uploadFileNotURL, setUploadFileNotURL] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [debloat, setDebloat] = useState<boolean>(false);
  const [url, setUrl] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/zip") {
        setFile(selectedFile);
        setUploadStatus("");
      } else {
        setUploadStatus("Please select a .zip file");
      }
    }
  };

  // const handleUpload = async () => {
  //   if (uploadFileNotURL && !file) {
  //     setUploadStatus("Please select a file");
  //     return;
  //   }
  //   if (!uploadFileNotURL && !url) {
  //     setUploadStatus("Please enter a URL");
  //     return;
  //   }

  //   try {
  //     const formData = new FormData();
  //     if (uploadFileNotURL && file) {
  //       formData.append("Name", file.name);
  //       formData.append("Content", file);
  //     } else if (!uploadFileNotURL) {
  //       formData.append("URL", url);
  //     }
  //     formData.append("Debloat", JSON.stringify(debloat));
  //     formData.append("JSProgram", "");

  //     const { response } = await API.post({
  //       apiName: "Phase2Webapp-RestApi",
  //       path: "/package",
  //       options: { body: formData },
  //     });

  //     const status = await response;
  //     setUploadStatus(status.statusCode === 200 ? "Upload successful" : `Upload failed: ${status.body}`);
  //   } catch (error) {
  //     setUploadStatus(`Error during upload: ${error}`);
  //   }
  // };

  const handleUpload = async () => {
    if (uploadFileNotURL && !file) {
      setUploadStatus("Please select a file");
      return;
    }
    if (!uploadFileNotURL && !url) {
      setUploadStatus("Please enter a URL");
      return;
    }
  
    try {
      const formData = new FormData();
      if (uploadFileNotURL && file) {
        formData.append("Name", file.name);
        formData.append("Content", file);
      } else if (!uploadFileNotURL) {
        formData.append("URL", url);
      }
      formData.append("Debloat", JSON.stringify(debloat));
      formData.append("JSProgram", "");
  
      // Call post function
      const response = await API.post("Phase2Webapp-RestApi", "/package", {
        body: formData, // Body data
        headers: { "Content-Type": "multipart/form-data" }, // Headers for form-data
      });
  
      setUploadStatus(response.statusCode === 200 ? "Upload successful" : `Upload failed: ${response.body}`);
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof Error) {
        setUploadStatus(`Error during upload: ${error.message}`);
      } else {
        setUploadStatus(`Error during upload: ${String(error)}`);
      }
    }

  return (
    <div>
      <title>Package Manager</title>
      <header className="App-header">
        <h1>Upload Your Package</h1>
        <div className="back-button">
        <Link href="/homepage">
            <button className="package-button">Back</button>
          </Link> 
        </div>
      </header>

      <main>
        <form className="input-section">
          {/* Toggle Switch for Upload Type */}
          <div className="form-group">
            <div className="toggle-container">
              <label>
                <input
                  type="radio"
                  name="uploadType"
                  value="zip"
                  checked={uploadFileNotURL}
                  onChange={() => setUploadFileNotURL(true)}
                />
                <span className="toggle-option">ZIP File</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="uploadTypeURL"
                  value="url"
                  checked={!uploadFileNotURL}
                  onChange={() => setUploadFileNotURL(false)}
                />
                <span className="toggle-option">URL</span>
              </label>
            </div>
          </div>

          {/* File or URL Input */}
          {uploadFileNotURL ? (
            <div className="form-group">
              <label htmlFor="file">Select File:</label>
              <input
                id="file"
                name="fileUpload"
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="input"
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="url">Enter URL:</label>
              <input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input"
                placeholder="Enter package URL"
              />
            </div>
          )}

          {/* Debloat Toggle */}
          <div className="form-group">
            <label className="switch">
              <span>Enable Debloat</span>
              <input
                type="checkbox"
                checked={debloat}
                onChange={() => setDebloat(!debloat)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {/* Upload Button */}
          <div className="button-group">
            <button
              className="search-button"
              type="button"
              onClick={handleUpload}
              disabled={uploadFileNotURL ? !file : !url}
            >
              Upload
            </button>
          </div>

          {/* Status Message */}
          {uploadStatus && <p className="status">{uploadStatus}</p>}
        </form>
      </main>
    </div>
  );
}
}
