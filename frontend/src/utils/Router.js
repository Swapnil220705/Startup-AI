import React, { useState, useEffect } from 'react';

export const Router = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    setCurrentPath(window.location.pathname);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div>
      {React.cloneElement(children, { currentPath, navigate })}
    </div>
  );
};