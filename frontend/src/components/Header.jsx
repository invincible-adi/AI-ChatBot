import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu } from 'lucide-react';

const Header = ({ title, showBackButton = false, onMenuClick }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 transition-colors duration-200">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 md:hidden"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
          )}
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white truncate max-w-[200px] sm:max-w-none">
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;