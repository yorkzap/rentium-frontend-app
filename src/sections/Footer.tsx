"use client";

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="container mx-auto px-6 text-center">
        <p>&copy; {new Date().getFullYear()} Rentium. All rights reserved.</p>
      </div>
    </footer>
  );
};
