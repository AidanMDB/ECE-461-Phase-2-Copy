"use client";

import React, { useState, useEffect } from "react";
import "../globals.css";
import "./update.css";
import API from "@aws-amplify/api";

export default function UpdatePage({ id }: { id: string }) {
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadType, setUploadType] = useState<"url" | "zip">("zip");
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
    if (uploadType === "zip" && !file) {
      setStatusMessage("Please select a ZIP file.");
    } else if (uploadType === "url" && !url) {
      setStatusMessage("Please enter a URL.");
    } else {
      setStatusMessage("Update submitted!");
    }
  };

  const handleUpdate = async () => {
    if (uploadType === "zip" && !file) {
      setStatusMessage("Please select a file");
      return;
    }
    if (uploadType === "url" && !url) {
        setStatusMessage("Please enter a URL");
      return;
    }

    try {
      const formData = new FormData();
      if (uploadType === "zip" && file) {
        formData.append("Name", file.name);
        formData.append("Content", file);
      } else if (uploadType === "url") {
        formData.append("URL", url);
      }
      formData.append("Debloat", JSON.stringify(debloat));
      formData.append("JSProgram", "");

      const { response } = await API.post({
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
      <header className="App-header">
        <h1>Update Package</h1>
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
                  checked={uploadType === "zip"}
                  onChange={() => setUploadType("zip")}
                />
                <span className="toggle-option">ZIP File</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="uploadType"
                  value="url"
                  checked={uploadType === "url"}
                  onChange={() => setUploadType("url")}
                />
                <span className="toggle-option">URL</span>
              </label>
            </div>
          </div>

          {/* File or URL Input */}
          {uploadType === "zip" ? (
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
              disabled={uploadType === "zip" ? !file : !url}
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
