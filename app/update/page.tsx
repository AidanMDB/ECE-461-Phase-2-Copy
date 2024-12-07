"use client";

import React, { useState, useEffect } from "react";
import "../globals.css";
import "./update.css";
import { post } from "@aws-amplify/api";
import Link from "next/link";

export default function UpdatePage() {
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadFileNotURL, setUploadFileNotURL] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>("");
  const [debloat, setDebloat] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatusMessage("");
    }
  };

  const handleSubmit = () => {
    if (uploadFileNotURL && !file) {
      setStatusMessage("Please select a ZIP file.");
    } else if (!uploadFileNotURL && !url) {
      setStatusMessage("Please enter a URL.");
    } else {
      setStatusMessage("Update submitted!");
    }
  };

  const handleUpdate = async () => {
    if (uploadFileNotURL && !file) {
      setStatusMessage("Please select a file");
      return;
    }
    if (!uploadFileNotURL && !url) {
        setStatusMessage("Please enter a URL");
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

      const { response } = await post({
        apiName: "Phase2Webapp-RestApi",
        path: "/package",
        options: { body: formData },
      });

      const status = await response;
      setStatusMessage(status.statusCode === 200 ? "Upload successful" : `Upload failed: ${status.body}`);
    } catch (error) {
        setStatusMessage(`Error during upload: ${error}`);
    }
  };

//   if (loading) return <p>Loading package details...</p>;

  return (
    <div>
      <title>Package Manager</title>
      <header className="App-header">
        <h1>Update Package</h1>
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
                  name="uploadType"
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

          {/* Update Package Button */}
          <div className="button-group">
            <button
              className="search-button"
              type="button"
              onClick={handleUpdate}
              disabled={uploadFileNotURL ? !file : !url}
            >
              Update Package
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && <p className="status">{statusMessage}</p>}
        </form>
      </main>
    </div>
  );
}
