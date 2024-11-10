"use client";

import { FileUploader } from "@aws-amplify/ui-react-storage";
import "../app.css";
import "@aws-amplify/ui-react/styles.css";

export default function UploadPage() {

    return (
      <FileUploader
        acceptedFileTypes={['image/*']}
        path="packageStorage/"
        maxFileCount={1}
        isResumable
      />
    );
};
