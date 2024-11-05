import Link from 'next/link';
import './package.css';

const Package = async (data:any) => {
    return (
      <div className="view-package-container">
      <header>
        <h1>View Package</h1>
      </header>

      <div className="package-content">
        <div className="package-title-block">
          <h2>Package Name: {(data.searchParams.name)}</h2>
        </div>

        <div className="button-container">
          <Link href="/homepage">
            <button className="package-button download">Download Package</button>
          </Link>
          <button className="package-button update">Update Package</button>
          <button className="package-button upload">Upload New Package</button>
        </div>
      </div>

      <div className="package-info-block">
        <div className="package-info">
          <p><strong>Version:</strong> v1.0.1</p>
          <p><strong>Description:</strong> Add me on roblox im looking for a cactus friend :D.</p>
          <p><strong>Author:</strong> fake author </p>
        </div>
      </div>
    </div>
    )
};

export default Package;