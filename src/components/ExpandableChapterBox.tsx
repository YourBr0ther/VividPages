import React, { useState } from 'react';

interface ExpandableChapterBoxProps {
  title: string;
  content: string;
  isExpanded?: boolean;
  maxLines?: number;
}

const ExpandableChapterBox: React.FC<ExpandableChapterBoxProps> = ({
  title,
  content,
  isExpanded: initialExpanded = false,
  maxLines = 3
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300">
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium text-gray-800 mb-2">{title}</h3>
        <div 
          className={`text-gray-600 leading-relaxed transition-all duration-300 ${
            !isExpanded ? 'line-clamp-' + maxLines : ''
          }`}
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <div className="mt-2 flex justify-end">
          <button 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpandableChapterBox; 