import { createContext, useState } from "react";


export const MyDnDContext = createContext()

const MyDnDContextProvider = ({ children }) => {

    const [isGrabbed,SETisGrabbed]=useState(false)


    return (
        <MyDnDContext.Provider value={{isGrabbed, SETisGrabbed}}>
            {children}
        </MyDnDContext.Provider>
    )

}

export default MyDnDContextProvider