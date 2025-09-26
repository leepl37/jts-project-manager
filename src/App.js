import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { firebaseConfig, geminiApiKey, appId } from './config';

// Gemini API configuration
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;

// Helper function to format the date as YYYY Month Day
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const day = d.getDate();
  return `${year} ${month} ${day}`;
};

// Helper function for secure password hashing
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// A harmonious color palette for project cards
const colorPalette = [
  '#A2D2FF', '#BDE0FE', '#CDB4DB', '#FFC8DD', '#FFADAD',
  '#FFD6A5', '#FFF4A3', '#FCE4EC', '#FCE2DA', '#E0FBE2'
];

// Helper function to generate a harmonious color
const generateRandomColor = () => {
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
};

const incomeCategories = ['Advance', 'Donation', 'Others'];
const expenseCategories = ['Supplies', 'Delivery', 'Food', 'Transportation', 'Others'];
const currencies = ['USD', 'EUR', 'KRW', 'JPY', 'CNY', 'INR', 'THB', 'LKR', 'VND'];

const AddTransactionPage = ({ editingTransaction, setCurrentPage, addTransaction, updateTransaction, handleDelete, setEditingTransaction }) => {
  const [type, setType] = useState(editingTransaction ? editingTransaction.type : 'expense');
  const [date, setDate] = useState(editingTransaction ? editingTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(editingTransaction ? editingTransaction.amount : '');
  const [description, setDescription] = useState(editingTransaction ? editingTransaction.description : '');
  const [category, setCategory] = useState(editingTransaction ? editingTransaction.category : '');
  const [receipts, setReceipts] = useState(editingTransaction ? editingTransaction.receipts : []);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptScanning, setReceiptScanning] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const transactionData = {
      type,
      date: new Date(date).toISOString(),
      amount: parseFloat(amount),
      description,
      category,
      receipts,
      timestamp: new Date().toISOString(),
    };

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData);
      setEditingTransaction(null);
    } else {
      addTransaction(transactionData);
    }
  };

  const handleReceiptUpload = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      setReceiptFile(files[0]);
      const newReceipts = Array.from(files).map(file => URL.createObjectURL(file));
      setReceipts([...receipts, ...newReceipts]);
    }
  };

  const handleScanReceipt = async () => {
    if (!receiptFile) {
      return;
    }
    setReceiptScanning(true);
    const reader = new FileReader();
    reader.readAsDataURL(receiptFile);
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      const userPrompt = `Extract the following information from this receipt in a JSON object format:
      {
        "date": "YYYY-MM-DD",
        "amount": number,
        "description": "string (the main item or service)",
        "category": "string (categorize the expense, e.g., 'dining', 'groceries', 'transportation')"
      }.
      Only return the JSON object, do not include any other text.`;

      try {
        const payload = {
          contents: [{
            parts: [
              { text: userPrompt },
              {
                inlineData: {
                  mimeType: "image/jpeg", // Assuming JPEG for receipts
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
          }
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsedData = JSON.parse(jsonText);
          if (parsedData.date) setDate(parsedData.date);
          if (parsedData.amount) setAmount(parsedData.amount);
          if (parsedData.description) setDescription(parsedData.description);
          if (parsedData.category) setCategory(parsedData.category);
        }
      } catch (error) {
        console.error("Error scanning receipt:", error);
      } finally {
        setReceiptScanning(false);
      }
    };
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans">
      <header className="bg-white p-4 shadow-md rounded-b-lg">
        <div className="flex justify-between items-center">
          <button onClick={() => setCurrentPage('account')} className="text-gray-600 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">{editingTransaction ? 'Edit Transaction' : 'New Transaction'}</h1>
          <div className="w-6"></div>
        </div>
        <div className="flex justify-center mt-4 space-x-2">
          <button
            onClick={() => setType('income')}
            className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${type === 'income' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Income
          </button>
          <button
            onClick={() => setType('expense')}
            className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'}`}
          >
            Expense
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <label className="block">
            <span className="text-gray-700">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-700">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Enter amount"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-700">Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Enter description"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-700">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            >
              <option value="" disabled>Select a category</option>
              {(type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-gray-700">Upload Receipt</span>
            <input
              type="file"
              onChange={handleReceiptUpload}
              multiple
              accept="image/*"
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </label>
          {receipts.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {receipts.map((receipt, index) => (
                <img key={index} src={receipt} alt={`Receipt ${index + 1}`} className="w-full h-20 object-cover rounded-md shadow" />
              ))}
            </div>
          )}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              type="button"
              onClick={handleScanReceipt}
              disabled={!receiptFile || receiptScanning}
              className={`px-6 py-3 bg-green-500 text-white rounded-lg font-bold shadow-md transition-colors duration-200 ${!receiptFile || receiptScanning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'}`}
            >
              {receiptScanning ? 'Scanning...' : '✨ Scan Receipt ✨'}
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold shadow-md hover:bg-blue-600 transition-colors duration-200"
            >
              Save
            </button>
            {editingTransaction && (
              <button
                type="button"
                onClick={() => handleDelete(editingTransaction)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-bold shadow-md hover:bg-red-600 transition-colors duration-200"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

const AddDailyReportPage = ({ editingReport, setCurrentPage, addDailyReport, updateDailyReport, deleteDailyReport, setEditingReport }) => {
  const [date, setDate] = useState(editingReport ? editingReport.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [participants, setParticipants] = useState(editingReport ? editingReport.participants : '');
  const [whatWeDid, setWhatWeDid] = useState(editingReport ? editingReport.whatWeDid : '');
  const [specialNote, setSpecialNote] = useState(editingReport ? editingReport.specialNote : '');
  const [photos, setPhotos] = useState(editingReport ? editingReport.photos : []);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 10);
    const newPhotos = files.map(file => URL.createObjectURL(file));
    setPhotos(newPhotos);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const reportData = {
      date: new Date(date).toISOString(),
      participants,
      whatWeDid,
      specialNote,
      photos,
      timestamp: new Date().toISOString(),
    };
    if (editingReport) {
      updateDailyReport(editingReport.id, reportData);
      setEditingReport(null);
    } else {
      addDailyReport(reportData);
    }
    setCurrentPage('dailyReport');
  };

  const handleDelete = () => {
    deleteDailyReport(editingReport.id);
    setEditingReport(null);
    setCurrentPage('dailyReport');
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans p-4">
      <header className="bg-white p-4 shadow-md rounded-b-lg flex justify-between items-center">
        <button onClick={() => { setCurrentPage('dailyReport'); setEditingReport(null); }} className="text-gray-600 hover:text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">{editingReport ? 'Edit Daily Report' : 'New Daily Report'}</h1>
        <div className="w-6"></div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <label className="block">
            <span className="text-gray-700">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-700">Participants</span>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Enter participants' names"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-700">What we did</span>
            <textarea
              value={whatWeDid}
              onChange={(e) => setWhatWeDid(e.target.value)}
              rows="4"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Describe your activities"
              required
            ></textarea>
          </label>
          <label className="block">
            <span className="text-gray-700">Special Note</span>
            <textarea
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              rows="2"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Add any special notes"
            ></textarea>
          </label>
          <label className="block">
            <span className="text-gray-700">Upload Photos (up to 10)</span>
            <input
              type="file"
              onChange={handlePhotoUpload}
              multiple
              accept="image/*"
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {photos.map((photo, index) => (
                <img key={index} src={photo} alt={`Report ${index + 1}`} className="w-full h-20 object-cover rounded-md shadow" />
              ))}
            </div>
          )}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-bold shadow-md hover:bg-blue-600 transition-colors duration-200"
            >
              {editingReport ? 'Update Report' : 'Save Report'}
            </button>
            {editingReport && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-bold shadow-md hover:bg-red-600 transition-colors duration-200"
              >
                Delete Report
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};


const DailyReportPage = ({ setCurrentPage, dailyReports, deleteDailyReport, setEditingReport }) => {
  const handleEdit = (report) => {
    setEditingReport(report);
    setCurrentPage('addDailyReport');
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans">
      <header className="bg-white p-4 shadow-md sticky top-0 z-10 rounded-b-lg">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentPage('home')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-semibold hover:bg-gray-300">Home</button>
          <h1 className="text-xl font-bold">Daily Reports</h1>
          <div className="flex space-x-2">
            <button onClick={() => setCurrentPage('account')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-semibold hover:bg-gray-300">Account</button>
            <button onClick={() => setCurrentPage('addDailyReport')} className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-md hover:bg-blue-600 transition-colors duration-200">
              + Add New
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <ul className="divide-y divide-gray-200">
            {dailyReports.map(report => (
              <li key={report.id} className="py-4 cursor-pointer" onClick={() => handleEdit(report)}>
                <div className="flex flex-col">
                  <p className="text-sm text-gray-500">{formatDate(report.date)}</p>
                  <p className="text-gray-800 font-medium mt-1">Participants: {report.participants}</p>
                  <p className="text-gray-600 text-sm mt-1">What we did: {report.whatWeDid}</p>
                  {report.specialNote && <p className="text-gray-600 text-sm mt-1">Note: {report.specialNote}</p>}
                  {report.photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {report.photos.map((photo, index) => (
                        <img key={index} src={photo} alt={`Report ${index + 1}`} className="w-full h-20 object-cover rounded-md shadow" />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

const CreateProjectPage = ({ setCurrentPage, addProject, editingProject, updateProject, deleteProject, setEditingProject }) => {
  const [projectName, setProjectName] = useState(editingProject ? editingProject.projectName : '');
  const [inCharge, setInCharge] = useState(editingProject ? editingProject.inCharge : '');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [currency, setCurrency] = useState(editingProject ? editingProject.currency : 'USD');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingProject && password !== verifyPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');

    try {
      const hashedPassword = await hashPassword(password);
      const projectData = {
        projectName,
        inCharge,
        currency,
        password: hashedPassword,
        color: generateRandomColor(),
      };
      if (editingProject) {
        await updateProject(editingProject.id, projectData);
      } else {
        await addProject(projectData);
      }
      setCurrentPage('home');
      setEditingProject(null);
    } catch (e) {
      setError('Error saving project.');
      console.error(e);
    }
  };

  const handleDelete = () => {
    deleteProject(editingProject.id);
    setEditingProject(null);
    setCurrentPage('home');
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans p-4">
      <header className="bg-white p-4 shadow-md rounded-b-lg flex justify-between items-center">
        <button onClick={() => setCurrentPage('home')} className="text-gray-600 hover:text-gray-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">{editingProject ? 'Edit Project' : 'Create Project'}</h1>
        <div className="w-6"></div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <label className="block">
            <span className="text-gray-700">Project Name</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Enter project name"
              required
            />
          </label>
          <label className="block">
            <span className="text-gray-700">In-charge Name</span>
            <input
              type="text"
              value={inCharge}
              onChange={(e) => setInCharge(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              placeholder="Enter in-charge name"
              required
            />
          </label>
          {!editingProject && (
            <>
              <label className="block">
                <span className="text-gray-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  required
                />
              </label>
              <label className="block">
                <span className="text-gray-700">Verify Password</span>
                <input
                  type="password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  required
                />
              </label>
            </>
          )}
          <label className="block">
            <span className="text-gray-700">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              required
            >
              {currencies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-bold shadow-md hover:bg-blue-600 transition-colors duration-200"
            >
              {editingProject ? 'Update Project' : 'Save Project'}
            </button>
            {editingProject && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-bold shadow-md hover:bg-red-600 transition-colors duration-200"
              >
                Delete Project
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
};

const PasswordModal = ({ isVisible, onClose, onVerify }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (await onVerify(password)) {
      onClose();
    } else {
      setError('Incorrect password.');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
        <h3 className="text-lg font-bold mb-4">Enter Password</h3>
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            placeholder="Password"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-center space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const HomePage = ({ setCurrentPage, projects, setEditingProject, setSelectedProject, setPasswordModalVisible }) => {
  const handleEditProject = (project) => {
    setEditingProject(project);
    setCurrentPage('createProject');
  };

  const handleAccessProject = (project) => {
    setSelectedProject(project);
    setPasswordModalVisible(true);
  };

  return (
    <div className="flex flex-col items-center h-full bg-gray-100 font-sans p-4">
      <header className="bg-white p-4 shadow-md rounded-b-lg w-full fixed top-0 z-10">
        <h1 className="text-xl font-bold text-center">JTS Project Manager</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 pt-20 w-full">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <ul className="space-y-4">
            {projects.map(project => (
              <li key={project.id}
                  className="p-4 rounded-lg shadow-md flex items-start space-x-4 cursor-pointer transition-transform transform hover:scale-105"
                  onClick={() => handleAccessProject(project)}>
                <div className="flex-shrink-0 w-full h-1 rounded-full absolute bottom-0 left-0" style={{ backgroundColor: project.color }}></div>
                <div className="flex flex-col flex-grow">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold">{project.projectName}</h3>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditProject(project); }}
                      className="text-gray-800 hover:text-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-col text-sm mt-1">
                    <p>In-charge: {project.inCharge}</p>
                    <p>Currency: {project.currency}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-20">
        <button
          onClick={() => setCurrentPage('createProject')}
          className="px-6 py-3 bg-blue-500 text-white rounded-full shadow-lg font-bold text-sm transform hover:scale-110 transition-transform duration-200"
        >
          + Create Project
        </button>
      </div>
    </div>
  );
};

const AccountPage = ({ transactions, totalIncome, totalExpense, balance, getBalanceColor, setCurrentPage, showDeleteModal, handleDelete, confirmDelete, cancelDelete, setEditingTransaction, selectedProject }) => {
  return (
    <div className="flex flex-col h-full bg-gray-100 font-sans">
      <header className="bg-white p-4 shadow-md sticky top-0 z-10 rounded-b-lg">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentPage('home')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-semibold">Home</button>
          <h1 className="text-xl font-bold">Account ({selectedProject?.currency || 'N/A'})</h1>
          <button onClick={() => setCurrentPage('dailyReport')} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full text-sm font-semibold">Daily Report</button>
        </div>
        <div className="flex justify-around text-center border-b pb-4">
          <div>
            <p className="text-gray-500 text-sm">Income</p>
            <p className="text-blue-500 font-semibold">${totalIncome.toLocaleString('en-US')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Expense</p>
            <p className="text-red-500 font-semibold">${totalExpense.toLocaleString('en-US')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Balance</p>
            <p className={`font-semibold ${getBalanceColor()}`}>${balance.toLocaleString('en-US')}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <ul className="divide-y divide-gray-200">
            {transactions.map(t => (
              <li key={t.id} className="py-4 cursor-pointer" onClick={() => {
                setEditingTransaction(t);
                setCurrentPage('add');
              }}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">{formatDate(t.date)}</p>
                    <p className="text-gray-800 font-medium">{t.description}</p>
                    <p className="text-gray-600 text-xs mt-1">{t.category}</p>
                  </div>
                  <p className={`font-bold ${t.type === 'income' ? 'text-blue-500' : 'text-red-500'}`}>${parseFloat(t.amount).toLocaleString('en-US')}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {transactions.some(t => t.receipts.length > 0) && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-bold mb-4">Receipts</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {transactions.flatMap(t => t.receipts.map((receipt, index) => (
                <div key={`${t.id}-${index}`} className="flex flex-col items-center">
                  <img src={receipt} alt="Receipt" className="rounded-lg shadow-md w-full h-32 object-cover" />
                  <p className="text-xs text-gray-500 mt-2 truncate w-full text-center">{t.description}</p>
                </div>
              )))}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-4 right-4 z-20">
        <button
          onClick={() => {
            setEditingTransaction(null);
            setCurrentPage('add');
          }}
          className="w-16 h-16 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-4xl transform hover:scale-110 transition-transform duration-200"
        >
          +
        </button>
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete this transaction?</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [user, setUser] = useState(null); // eslint-disable-line no-unused-vars
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    try {
      if (Object.keys(firebaseConfig).length > 0) {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestoreDb = getFirestore(app);
        setDb(firestoreDb);

        const setupAuth = async () => {
          try {
            await signInAnonymously(auth);
            const currentUser = auth.currentUser;
            setUser(currentUser);
            setUserId(currentUser.uid);
          } catch (error) {
            console.error("Firebase auth error:", error);
          }
        };

        setupAuth();
      } else {
        console.error("Firebase config is empty. Please check your configuration.");
      }
    } catch (error) {
      console.error("Firebase initialization failed:", error);
    }
  }, []);

  useEffect(() => {
    if (db && userId) {
      // Fetch projects
      const projectsCollectionPath = `/artifacts/${appId}/users/${userId}/projects`;
      const projectsCollectionRef = collection(db, projectsCollectionPath);
      const projectsQuery = query(projectsCollectionRef);

      const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
        const projectList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(projectList);
      }, (error) => {
        console.error("Error fetching projects: ", error);
      });

      // Fetch transactions for selected project
      let unsubscribeTransactions = () => {};
      if (selectedProject) {
        const transactionsCollectionPath = `/artifacts/${appId}/users/${userId}/transactions`;
        const transactionsCollectionRef = collection(db, transactionsCollectionPath);
        const q = query(transactionsCollectionRef, where("projectId", "==", selectedProject.id));
        unsubscribeTransactions = onSnapshot(q, (snapshot) => {
          const transactionList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            receipts: JSON.parse(doc.data().receipts || '[]'),
          }));
          transactionList.sort((a, b) => new Date(b.date) - new Date(a.date));
          setTransactions(transactionList);
        }, (error) => {
          console.error("Error fetching transactions: ", error);
        });
      }

      // Fetch daily reports for selected project
      let unsubscribeReports = () => {};
      if (selectedProject) {
        const reportCollectionPath = `/artifacts/${appId}/users/${userId}/daily_reports`;
        const reportsCollectionRef = collection(db, reportCollectionPath);
        const reportsQuery = query(reportsCollectionRef, where("projectId", "==", selectedProject.id));

        unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
          const reportList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            photos: JSON.parse(doc.data().photos || '[]'),
          }));
          reportList.sort((a, b) => new Date(b.date) - new Date(a.date));
          setDailyReports(reportList);
        }, (error) => {
          console.error("Error fetching daily reports: ", error);
        });
      }

      return () => {
        unsubscribeProjects();
        unsubscribeTransactions();
        unsubscribeReports();
      };
    }
  }, [db, userId, selectedProject]);

  const addProject = async (project) => {
    if (!db || !userId) {
      console.error("Database or User ID not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/projects`;
    try {
      await addDoc(collection(db, collectionPath), project);
    } catch (e) {
      console.error("Error adding project: ", e);
    }
  };

  const updateProject = async (id, updatedProject) => {
    if (!db || !userId) {
      console.error("Database or User ID not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/projects`;
    const projectRef = doc(db, collectionPath, id);
    try {
      await updateDoc(projectRef, updatedProject);
    } catch (e) {
      console.error("Error updating project: ", e);
    }
  };

  const deleteProject = async (id) => {
    if (!db || !userId) {
      console.error("Database or User ID not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/projects`;
    const projectRef = doc(db, collectionPath, id);
    try {
      await deleteDoc(projectRef);
    } catch (e) {
      console.error("Error deleting project: ", e);
    }
  };


  const addTransaction = async (transaction) => {
    if (!db || !userId || !selectedProject) {
      console.error("Database, User ID, or selected project not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/transactions`;
    try {
      await addDoc(collection(db, collectionPath), {
        ...transaction,
        projectId: selectedProject.id,
        receipts: JSON.stringify(transaction.receipts),
      });
      setCurrentPage('account');
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  const updateTransaction = async (id, updatedTransaction) => {
    if (!db || !userId || !selectedProject) {
      console.error("Database, User ID, or selected project not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/transactions`;
    const transactionRef = doc(db, collectionPath, id);
    try {
      await updateDoc(transactionRef, {
        ...updatedTransaction,
        receipts: JSON.stringify(updatedTransaction.receipts),
      });
      setCurrentPage('account');
      setEditingTransaction(null);
    } catch (e) {
      console.error("Error updating document: ", e);
    }
  };

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!db || !userId || !transactionToDelete) {
      console.error("Database or User ID not available, or no transaction selected for deletion.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/transactions`;
    const transactionRef = doc(db, collectionPath, transactionToDelete.id);
    try {
      await deleteDoc(transactionRef);
      setShowDeleteModal(false);
      setTransactionToDelete(null);
    } catch (e) {
      console.error("Error deleting document: ", e);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTransactionToDelete(null);
  };

  const addDailyReport = async (report) => {
    if (!db || !userId || !selectedProject) {
      console.error("Database, User ID, or selected project not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/daily_reports`;
    try {
      await addDoc(collection(db, collectionPath), {
        ...report,
        projectId: selectedProject.id,
        photos: JSON.stringify(report.photos),
      });
    } catch (e) {
      console.error("Error adding daily report: ", e);
    }
  };

  const updateDailyReport = async (id, updatedReport) => {
    if (!db || !userId || !selectedProject) {
      console.error("Database, User ID, or selected project not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/daily_reports`;
    const reportRef = doc(db, collectionPath, id);
    try {
      await updateDoc(reportRef, {
        ...updatedReport,
        photos: JSON.stringify(updatedReport.photos),
      });
    } catch (e) {
      console.error("Error updating daily report: ", e);
    }
  };

  const deleteDailyReport = async (id) => {
    if (!db || !userId || !selectedProject) {
      console.error("Database, User ID, or selected project not available.");
      return;
    }
    const collectionPath = `/artifacts/${appId}/users/${userId}/daily_reports`;
    const reportRef = doc(db, collectionPath, id);
    try {
      await deleteDoc(reportRef);
    } catch (e) {
      console.error("Error deleting daily report: ", e);
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const getBalanceColor = () => {
    if (balance > 0) return 'text-blue-500';
    if (balance < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const verifyPassword = async (inputPassword) => {
    if (!selectedProject) return false;
    const hashedInput = await hashPassword(inputPassword);
    if (hashedInput === selectedProject.password) {
      setCurrentPage('account');
      return true;
    }
    return false;
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-200 p-4">
      <div className="w-full max-w-md h-full bg-white rounded-xl shadow-lg overflow-hidden">
        {currentPage === 'home' ? (
          <HomePage
            setCurrentPage={setCurrentPage}
            projects={projects}
            setEditingProject={setEditingProject}
            setSelectedProject={setSelectedProject}
            setPasswordModalVisible={setPasswordModalVisible}
          />
        ) : currentPage === 'createProject' ? (
          <CreateProjectPage
            setCurrentPage={setCurrentPage}
            addProject={addProject}
            editingProject={editingProject}
            updateProject={updateProject}
            deleteProject={deleteProject}
            setEditingProject={setEditingProject}
          />
        ) : currentPage === 'account' ? (
          <AccountPage
            transactions={transactions}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            balance={balance}
            getBalanceColor={getBalanceColor}
            setCurrentPage={setCurrentPage}
            showDeleteModal={showDeleteModal}
            handleDelete={handleDelete}
            confirmDelete={confirmDelete}
            cancelDelete={cancelDelete}
            setEditingTransaction={setEditingTransaction}
            selectedProject={selectedProject}
          />
        ) : currentPage === 'dailyReport' ? (
          <DailyReportPage
            setCurrentPage={setCurrentPage}
            dailyReports={dailyReports}
            deleteDailyReport={deleteDailyReport}
            setEditingReport={setEditingReport}
          />
        ) : currentPage === 'addDailyReport' ? (
          <AddDailyReportPage
            editingReport={editingReport}
            setCurrentPage={setCurrentPage}
            addDailyReport={addDailyReport}
            updateDailyReport={updateDailyReport}
            deleteDailyReport={deleteDailyReport}
            setEditingReport={setEditingReport}
          />
        ) : (
          <AddTransactionPage
            editingTransaction={editingTransaction}
            setCurrentPage={setCurrentPage}
            addTransaction={addTransaction}
            updateTransaction={updateTransaction}
            handleDelete={handleDelete}
            setEditingTransaction={setEditingTransaction}
          />
        )}
        <PasswordModal
          isVisible={passwordModalVisible}
          onClose={() => setPasswordModalVisible(false)}
          onVerify={verifyPassword}
        />
      </div>
    </div>
  );
};

export default App;
