import React, { useContext, useEffect, useState, createContext } from "react";
const SidebarContext = createContext();

const SidebarProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState();



  useEffect(() => {
    let ls = localStorage.getItem("isSidebarOpen")
    if (ls) {
      if (ls == "off")
        setIsSidebarOpen(false)
      else
        if (ls == "on")
          setIsSidebarOpen(true)

    } else {
      setIsSidebarOpen(true)
      localStorage.setItem("isSidebarOpen", "on")
    }
  }, [])




  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);

    localStorage.setItem("isSidebarOpen", localStorage.getItem("isSidebarOpen") == "on" ?
      "off" : "on"
    )

  };

  const value = {
    isSidebarOpen,
    toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export { SidebarContext, SidebarProvider };
