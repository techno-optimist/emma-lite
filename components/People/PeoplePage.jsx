import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Heart, Briefcase, UserPlus } from 'lucide-react';
import { apiService } from '../../services/api';
import PersonCard from './PersonCard';
import PersonModal from './PersonModal';
import AddPersonModal from './AddPersonModal';

const PeoplePage = () => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState('all');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const relationships = [
    { value: 'all', label: 'All People', icon: Users },
    { value: 'family', label: 'Family', icon: Heart },
    { value: 'friend', label: 'Friends', icon: Users },
    { value: 'best_friend', label: 'Best Friends', icon: Heart },
    { value: 'romantic', label: 'Romantic', icon: Heart },
    { value: 'colleague', label: 'Colleagues', icon: Briefcase },
  ];

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPeople(1);
      setPeople(data);
    } catch (error) {
      console.error('Failed to load people:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPeople = people.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRelationship = selectedRelationship === 'all' || person.relationship === selectedRelationship;
    return matchesSearch && matchesRelationship;
  });

  const handlePersonClick = (person) => {
    setSelectedPerson(person);
    setShowPersonModal(true);
  };

  const handleAddPerson = () => {
    setShowAddModal(true);
  };

  const handlePersonAdded = () => {
    loadPeople();
    setShowAddModal(false);
  };

  const handlePersonUpdated = () => {
    loadPeople();
    setShowPersonModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">People</h1>
          <p className="text-gray-600">Manage your family, friends, and connections</p>
        </div>
        <button
          onClick={handleAddPerson}
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Add Person
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedRelationship}
          onChange={(e) => setSelectedRelationship(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {relationships.map(rel => (
            <option key={rel.value} value={rel.value}>{rel.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total People</p>
              <p className="text-2xl font-bold text-gray-900">{people.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Heart className="w-8 h-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Family & Close</p>
              <p className="text-2xl font-bold text-gray-900">
                {people.filter(p => ['family', 'best_friend', 'romantic'].includes(p.relationship)).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Briefcase className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Colleagues</p>
              <p className="text-2xl font-bold text-gray-900">
                {people.filter(p => p.relationship === 'colleague').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* People Grid */}
      {filteredPeople.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No people found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedRelationship !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first person'
            }
          </p>
          {!searchTerm && selectedRelationship === 'all' && (
            <button
              onClick={handleAddPerson}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Add Your First Person
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filteredPeople.map(person => (
            <PersonCard
              key={person.id}
              person={person}
              onClick={() => handlePersonClick(person)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showPersonModal && selectedPerson && (
        <PersonModal
          person={selectedPerson}
          onClose={() => setShowPersonModal(false)}
          onUpdate={handlePersonUpdated}
        />
      )}

      {showAddModal && (
        <AddPersonModal
          onClose={() => setShowAddModal(false)}
          onAdd={handlePersonAdded}
        />
      )}
    </div>
  );
};

export default PeoplePage;

