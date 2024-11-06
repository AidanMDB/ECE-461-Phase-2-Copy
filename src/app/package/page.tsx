import Link from 'next/link';
import './package.css';

const Package = async (data:any) => {
    return (
      <div className="view-package-container">
      <header className='App-header'>
        <div className="button-container">
          <Link href="/homepage">
            <button className="package-button">Download Package</button>
          </Link>
          <button className="package-button">Update Package</button>
          {/* <button className="package-button upload">Upload New Package</button> */}
        </div>
        <h1>{(data.searchParams.name)} by package author</h1>
      </header>

      {/* <div className="package-content">
        <div className="button-container">
          <Link href="/homepage">
            <button className="package-button download">Download Package</button>
          </Link>
          <button className="package-button update">Update Package</button>
        </div>
      </div> */}

      <div className="package-info-block">
        <div className="package-info">
          <p><strong>Version:</strong> v1.0.1</p>
          <p><strong>Description:</strong> Readme here or brief description.</p>
          {/* <p><strong>Author:</strong> fake author </p> */}
        </div>
      </div>
    </div>
    )
};

export default Package;