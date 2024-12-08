import Link from 'next/link';
import './package.css';
import '../globals.css';
import { handler } from '../../amplify/functions/api-package-list/handler';
// import { Auth } from 'aws-amplify';

const Package = async (data:any) => {
  // Fetch packages from the backend
  const response = await fetch('https://wdyoiqbu66.execute-api.us-east-1.amazonaws.com/dev/packages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': 'static-token', // Replace with actual token
      },
      body: JSON.stringify(data),
    });
  
    const packages = await response.json();

    return (
      <div className="view-package-container">
        <title>Package Manager</title>
        <header className="App-header">
          <div className="back-button">
            <Link href="/homepage">
              <button className="package-button">Back</button>
            </Link>
          </div>
          <div className="button-container">
            <Link href="/homepage">
              <button className="package-button">Download Package</button>
            </Link>
            <form action="/action_page.php">
              <input type="file" id="myFile" name="filename" />
              <Link href="/update">
                <button className="package-button" type="submit">Update Package</button>
              </Link>
            </form>
          </div>
          <h1>
            {data.searchParams.name} by package author
          </h1>
        </header>
        <div className="package-info-block">
          {packages.map((pkg: any, index: number) => (
            <div className="package-info" key={index}>
              <p>
                <strong>Version:</strong> {pkg.Version}
              </p>
              <p>
                <strong>Name:</strong> {pkg.Name}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  export default Package;
    // return (
    //   <div className="view-package-container">
    //     <title>Package Manager</title>
    //   <header className='App-header'>
    //     <div className="back-button">
    //     <Link href="/homepage">
    //         <button className="package-button">Back</button>
    //       </Link> 
    //     </div>
    //     <div className="button-container">
    //       <Link href="/homepage">
    //         <button className="package-button">Download Package</button>
    //       </Link>
    //       <form action="/action_page.php">
    //       <input type="file" id="myFile" name="filename"></input>
    //       <Link href="/update">
    //       <button className="package-button" type="submit">Update Package</button>
    //       </Link>
    //       </form>
    //       {/* <button className="package-button upload">Upload New Package</button> */}
    //     </div>
    //     <h1>{((await data.searchParams).name)} by package author</h1>
    //   </header>

      {/* <div className="package-content">
        <div className="button-container">
          <Link href="/homepage">
            <button className="package-button download">Download Package</button>
          </Link>
          <button className="package-button update">Update Package</button>
        </div>
      </div> */}

      {/* <div className="package-info-block">
        <div className="package-info">
          <p><strong>Version:</strong> v1.0.1</p>
          <p><strong>Description:</strong> Readme here or brief description.</p>
        </div>
      </div>
    </div>
    ) */}
// };

// export default Package;