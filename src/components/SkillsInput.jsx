// src/components/SkillsInput.jsx
import { useState, useRef, useEffect } from 'react';
import AutocompleteInput from './AutocompleteInput';

const COMMON_SKILLS = [
  'Driving', 'Customer Service', 'Logistics', 'Warehouse Management',
  'Forklift Operation', 'Inventory Management', 'Data Entry', 'Microsoft Office',
  'Communication', 'Team Leadership', 'Problem Solving', 'Time Management',
  'Safety Compliance', 'Quality Control', 'Documentation', 'Record Keeping',
  'Route Planning', 'Vehicle Maintenance', 'Loading/Unloading', 'Packaging',
  'Shipping', 'Receiving', 'Order Processing', 'Stock Management',
  'Supervision', 'Training', 'Reporting', 'Analytical Skills',
  'Attention to Detail', 'Multitasking', 'Computer Skills', 'Email Communication',
  'Phone Etiquette', 'Sales', 'Negotiation', 'Project Management',
  'Budget Management', 'Vendor Management', 'Procurement', 'Supply Chain',
  'Distribution', 'Transportation', 'Fleet Management', 'Compliance',
  'First Aid', 'CPR', 'Hazardous Materials Handling', 'Equipment Operation'
];

function SkillsInput({ skills = [], onChange }) {
  const [skillInputs, setSkillInputs] = useState(
    skills.length > 0 ? [...skills, ''] : ['']
  );
  const [showSuggestions, setShowSuggestions] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    // Sync with external skills array
    const validSkills = skills.filter(s => s && s.trim() !== '');
    const currentValidSkills = skillInputs.filter(s => s && s.trim() !== '');
    
    // Check if skills have changed
    if (validSkills.length !== currentValidSkills.length || 
        validSkills.some((skill, idx) => skill !== currentValidSkills[idx])) {
      const newInputs = validSkills.length > 0 ? [...validSkills, ''] : [''];
      setSkillInputs(newInputs);
    }
  }, [skills]);

  const handleSkillChange = (index, value) => {
    const newInputs = [...skillInputs];
    newInputs[index] = value;
    setSkillInputs(newInputs);

    // Filter out empty skills and update parent
    const validSkills = newInputs.filter(s => s.trim() !== '');
    onChange(validSkills);

    // If the last input has a value, add a new empty input
    if (index === skillInputs.length - 1 && value.trim() !== '') {
      setSkillInputs([...newInputs, '']);
    }
  };

  const handleSkillRemove = (index) => {
    const newInputs = skillInputs.filter((_, i) => i !== index);
    // Ensure at least one empty input remains
    if (newInputs.length === 0 || newInputs.every(s => s.trim() !== '')) {
      newInputs.push('');
    }
    setSkillInputs(newInputs);

    // Update parent with valid skills
    const validSkills = newInputs.filter(s => s.trim() !== '');
    onChange(validSkills);
  };

  const handleSkillSelect = (index, option) => {
    // AutocompleteInput passes the selected value directly as a string
    const skillValue = typeof option === 'string' ? option : (option?.name || option?.value || '');
    if (skillValue) {
      handleSkillChange(index, skillValue);
    }
  };

  // Filter suggestions based on what's already selected
  const getFilteredSuggestions = (currentValue, currentIndex) => {
    const selectedSkills = skillInputs
      .map((s, i) => i !== currentIndex ? s.trim() : '')
      .filter(s => s !== '');
    
    return COMMON_SKILLS.filter(skill => {
      const skillLower = skill.toLowerCase();
      const valueLower = currentValue.toLowerCase();
      // Show if it matches the input and isn't already selected
      return skillLower.includes(valueLower) && !selectedSkills.includes(skill);
    });
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {skillInputs.map((skill, index) => (
        <div key={index} className="flex gap-2 items-start">
          <div className="flex-1">
            <AutocompleteInput
              value={skill}
              onChange={(value) => handleSkillChange(index, value)}
              options={getFilteredSuggestions(skill, index)}
              placeholder={index === skillInputs.length - 1 ? "Type to add a skill..." : "Skill"}
              onSelect={(option) => handleSkillSelect(index, option)}
              listId={`skill-input-${index}`}
            />
          </div>
          {skillInputs.length > 1 && (
            <button
              type="button"
              onClick={() => handleSkillRemove(index)}
              className="mt-0.5 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove skill"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ))}
      {skillInputs.filter(s => s.trim() !== '').length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {skillInputs.filter(s => s.trim() !== '').length} skill(s) added
        </p>
      )}
    </div>
  );
}

export default SkillsInput;

