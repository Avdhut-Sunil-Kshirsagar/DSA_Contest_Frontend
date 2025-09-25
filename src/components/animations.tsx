import React, { useEffect, useRef, useState } from 'react';

interface AnimationProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const FadeInUp: React.FC<AnimationProps> = ({ children, delay = 0, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const FadeInLeft: React.FC<AnimationProps> = ({ children, delay = 0, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        isVisible 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 -translate-x-4'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const FadeInRight: React.FC<AnimationProps> = ({ children, delay = 0, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        isVisible 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-4'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const ScaleIn: React.FC<AnimationProps> = ({ children, delay = 0, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-300 ease-out ${
        isVisible 
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-95'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const StaggerContainer: React.FC<AnimationProps> = ({ children, className = '' }) => {
  return (
    <div className={`stagger-container ${className}`}>
      {children}
    </div>
  );
};

export const HoverScale: React.FC<AnimationProps> = ({ children, className = '' }) => {
  return (
    <div className={`transition-transform duration-200 hover:scale-105 ${className}`}>
      {children}
    </div>
  );
};

