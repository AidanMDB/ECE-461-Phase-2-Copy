"use client";

import "../app.css";
// import "@aws-amplify/ui-react/styles.css";
import React, { useState } from "react";
import API from "@aws-amplify/api";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [debloat, setDebloat] = useState<boolean>(false);

  /*
  * Handles file change event
  */
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

  /*
  * Handles upload button click
  */
  const handleUpload = async () => {
    // check if a files is given
    if (!file) {
      setUploadStatus("Please select a file");
      return;
    }

    try {
      // get data from form input
      const formData = new FormData();
      formData.append("Name", file.name);
      formData.append("Content", file);
      formData.append("Debloat", JSON.stringify(debloat));
      formData.append("JSProgram", '');

      const { response } = await API.post({
        apiName: "Phase2Webapp-RestApi",
        path: "/package",
        options: {
          headers: {},      // will have to fill in with cognito
          body: formData
          }
        }
      )

      if ((await response).statusCode === 200) {
        setUploadStatus("File Uploaded successfully");
      }
      else {
        setUploadStatus(`Upload failed: ${(await response).body}`);
      }
    } catch (error) {
      setUploadStatus(`Error within upload/pages.tsx: ${error}`);
    }
  };

    return (
      <div>
        <h1>Upload Your Package</h1>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
        />
        <label>
          <input 
            type="checkbox" 
            checked={debloat}
            onChange={(e) => setDebloat(e.target.checked)}
          />
          Enable Debloat
        </label>
        <button onClick={handleUpload} disabled={!file}>Upload</button>
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>
    );
};
