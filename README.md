# Package Repository Web Application  

https://main.dec29zvcbtyi8.amplifyapp.com/ 

## Overview  
This web application serves as a **package repository**, enabling users to:  
- Input a link from **NPM**, **GitHub**, or a **zip file** to upload packages.  
- Search for detailed information about uploaded packages.  
- Update or re-upload existing packages.  
- Download packages directly from the repository.  

The application is hosted on **AWS Amplify**, ensuring scalability and reliability.  

---

## Features  
- **Package Upload**: Users can submit links (npm, GitHub) or upload zip files to add packages to the repository.  
- **Package Management**: Search, update, or replace existing package entries.  
- **Package Downloads**: Access and download stored packages conveniently.  

---

## Getting Started  

### Prerequisites  
Ensure you have the following before starting:  
1. **AWS Account**: Access to AWS services for deploying and maintaining the application.  
2. **npm & Node.js**: Installed for any local development.  
3. **Git**: Installed for cloning the repository and version control.  

### Configuration  
1. Clone the repository:  
   git clone <https://github.com/AidanMDB/ECE-461-Phase-2-Copy>  
2. Install dependencies:
    npm install
3. Configure environment variables
    - Create .env file in root directory
    - Add AWS access keys and S3 bucket information

### Deployment
The project is designed to be deployed through AWS Amplify. Follow these steps:
    1. Log into AWS Console
    2. Navigate to AWS Amplify.
    3. Connect your GitHub repository to Amplify.
    4. Configure build settings (automatically detected or manually adjust amplify.yml).
    5. Deploy your application.

Once deployed, your application will be live and accessible via the provided AWS Amplify URL.

---


### Interacting with the Application
    1. **Access the Web Application**: Navigate to the deployed URL.
    2. **Upload a Package**: Use the intuitive upload form to add packages via npm/GitHub links or by uploading a zip file.
    3. **Search Packages**: Use the search bar to locate detailed package information.
    4. **Manage Packages**: Update existing packages or re-upload files.
    5. **Download Packages**: Click the download button next to a package entry.


---


### License
This project is licensed under the MIT License.
  
