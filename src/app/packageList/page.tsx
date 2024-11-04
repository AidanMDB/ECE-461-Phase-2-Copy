//"use client";
import './package.css';
//import Form from 'next/form';
//import { useState } from 'react';

const PackagesPage = async () => {

    return (
        <div className="Package">
            <form>
                <label>
                    Package Name:
                    <input 
                     type="text" 
                     name="packageName"
                     
                     
                    />
                </label>
                <button type='submit'>Submit</button>
            </form>
        </div>
    )
};

export default PackagesPage;