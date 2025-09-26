import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { firebaseConfig, appId } from './config';
import { initializeApp } from 'firebase/app';

const AdminDashboard = ({ onLogout }) => {
  const [allProjects, setAllProjects] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('projects');
  const [editingProject, setEditingProject] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      
      // Fetch all projects from all users
      const projectsSnapshot = await getDocs(collection(db, `artifacts/${appId}/users`));
      const projectsData = [];
      const transactionsData = [];
      const reportsData = [];

      for (const userDoc of projectsSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get user's projects
        const userProjectsSnapshot = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/projects`));
        userProjectsSnapshot.forEach(projectDoc => {
          projectsData.push({
            id: projectDoc.id,
            userId,
            ...projectDoc.data()
          });
        });

        // Get user's transactions
        const userTransactionsSnapshot = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/transactions`));
        userTransactionsSnapshot.forEach(transactionDoc => {
          transactionsData.push({
            id: transactionDoc.id,
            userId,
            ...transactionDoc.data()
          });
        });

        // Get user's reports
        const userReportsSnapshot = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/daily_reports`));
        userReportsSnapshot.forEach(reportDoc => {
          reportsData.push({
            id: reportDoc.id,
            userId,
            ...reportDoc.data()
          });
        });
      }

      setAllProjects(projectsData);
      setAllTransactions(transactionsData);
      setAllReports(reportsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  const handleDeleteProject = async (project) => {
    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      
      // Delete project
      await deleteDoc(doc(db, `artifacts/${appId}/users/${project.userId}/projects`, project.id));
      
      // Delete all related transactions
      const projectTransactions = allTransactions.filter(t => t.projectId === project.id);
      for (const transaction of projectTransactions) {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${project.userId}/transactions`, transaction.id));
      }
      
      // Delete all related reports
      const projectReports = allReports.filter(r => r.projectId === project.id);
      for (const report of projectReports) {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${project.userId}/daily_reports`, report.id));
      }
      
      // Refresh data
      fetchAllData();
      setShowDeleteModal(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleEditProject = async (projectId, updatedData) => {
    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const project = allProjects.find(p => p.id === projectId);
      
      await updateDoc(doc(db, `artifacts/${appId}/users/${project.userId}/projects`, projectId), updatedData);
      fetchAllData();
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const exportReceiptsToCSV = () => {
    const csvData = allTransactions
      .filter(t => t.receipts && t.receipts.length > 0)
      .map(transaction => {
        const project = allProjects.find(p => p.id === transaction.projectId);
        return {
          'Project Name': project?.projectName || 'Unknown',
          'User ID': transaction.userId,
          'Date': new Date(transaction.date).toLocaleDateString(),
          'Type': transaction.type,
          'Amount': transaction.amount,
          'Description': transaction.description,
          'Category': transaction.category,
          'Receipt Count': JSON.parse(transaction.receipts || '[]').length,
          'Timestamp': new Date(transaction.timestamp).toLocaleString()
        };
      });

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex space-x-4">
              <button
                onClick={exportReceiptsToCSV}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
              >
                Export Receipts CSV
              </button>
              <button
                onClick={onLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'projects', name: 'Projects', count: allProjects.length },
              { id: 'transactions', name: 'Transactions', count: allTransactions.length },
              { id: 'reports', name: 'Daily Reports', count: allReports.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTab === 'projects' && (
          <ProjectsTab
            projects={allProjects}
            onEdit={setEditingProject}
            onDelete={(project) => {
              setProjectToDelete(project);
              setShowDeleteModal(true);
            }}
          />
        )}
        
        {selectedTab === 'transactions' && (
          <TransactionsTab transactions={allTransactions} projects={allProjects} />
        )}
        
        {selectedTab === 'reports' && (
          <ReportsTab reports={allReports} projects={allProjects} />
        )}
      </main>

      {/* Edit Project Modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onSave={handleEditProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          project={projectToDelete}
          onConfirm={handleDeleteProject}
          onCancel={() => {
            setShowDeleteModal(false);
            setProjectToDelete(null);
          }}
        />
      )}
    </div>
  );
};

// Projects Tab Component
const ProjectsTab = ({ projects, onEdit, onDelete }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-4 py-5 sm:p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        All Projects ({projects.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Charge
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Currency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map(project => (
              <tr key={`${project.userId}-${project.id}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {project.projectName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.inCharge}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {project.userId.substring(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onEdit(project)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(project)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Transactions Tab Component
const TransactionsTab = ({ transactions, projects }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-4 py-5 sm:p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        All Transactions ({transactions.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map(transaction => {
              const project = projects.find(p => p.id === transaction.projectId);
              return (
                <tr key={`${transaction.userId}-${transaction.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project?.projectName || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${parseFloat(transaction.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.category}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// Reports Tab Component
const ReportsTab = ({ reports, projects }) => (
  <div className="bg-white shadow rounded-lg">
    <div className="px-4 py-5 sm:p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        All Daily Reports ({reports.length})
      </h3>
      <div className="space-y-4">
        {reports.map(report => {
          const project = projects.find(p => p.id === report.projectId);
          return (
            <div key={`${report.userId}-${report.id}`} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">
                  {project?.projectName || 'Unknown Project'}
                </h4>
                <span className="text-sm text-gray-500">
                  {new Date(report.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Participants:</strong> {report.participants}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Activities:</strong> {report.whatWeDid}
              </p>
              {report.specialNote && (
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> {report.specialNote}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// Edit Project Modal Component
const EditProjectModal = ({ project, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    projectName: project.projectName,
    inCharge: project.inCharge,
    currency: project.currency
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(project.id, formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">Edit Project</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              In Charge
            </label>
            <input
              type="text"
              value={formData.inCharge}
              onChange={(e) => setFormData({...formData, inCharge: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({...formData, currency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="KRW">KRW</option>
              <option value="JPY">JPY</option>
              <option value="CNY">CNY</option>
              <option value="INR">INR</option>
              <option value="THB">THB</option>
              <option value="LKR">LKR</option>
              <option value="VND">VND</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({ project, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
      <h3 className="text-lg font-bold mb-4 text-red-600">Delete Project</h3>
      <p className="mb-4 text-gray-700">
        Are you sure you want to delete the project <strong>"{project?.projectName}"</strong>?
        This will also delete all associated transactions and daily reports.
      </p>
      <p className="mb-6 text-sm text-red-600">
        This action cannot be undone.
      </p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(project)}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          Delete Project
        </button>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
