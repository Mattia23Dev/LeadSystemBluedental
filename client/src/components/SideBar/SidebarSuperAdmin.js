import React, { useContext, useEffect, useState } from 'react';
import './Sidebar.scss';
import { IoMdClose, IoMdMenu, } from 'react-icons/io'
import { Link } from 'react-router-dom'
import { BsChevronDown, BsChevronRight } from 'react-icons/bs';
import { UserContext } from '../../context';
import { useLocation } from 'react-router-dom/cjs/react-router-dom';
import { SidebarContext } from '../../context/SidebarContext';
import { FaArrowDown, FaArrowRight, FaQuestion, FaQuestionCircle } from 'react-icons/fa';
import logo from '../../imgs/Logo_leadsystem_black 2.png';
import './sidebarSuperAdmin.css';
import sidebar1 from '../../imgs/sidebarSP1.png';

const SidebarSuperAdmin = () => {

    const { isSidebarOpen, toggleSidebar } = useContext(SidebarContext);

    const [state, setState, headerIndex] = useContext(UserContext);
    const [active, setActive] = useState();



    useEffect(() => {
    if (isSidebarOpen) {
      if (isSidebarOpen == false)
      setActive(false)
      else
        if (isSidebarOpen == true)
        setActive(true)
    }
  }, [])




    const activateNav = () => {
        setActive(!active);
        toggleSidebar();
    };

    const location = useLocation()

    const [toselect, SETtoselect] = useState('')

    useEffect(() => {
        if (location.pathname.includes("account"))
            SETtoselect("account")
        else
            if (location.pathname.includes("boost"))
                SETtoselect("boost")
            else {
                if (location.pathname.includes("orientatori"))
                    SETtoselect("orientatori")
                else {
                    if (location.pathname.includes("impostazioni"))
                        SETtoselect("impostazioni")
                    else {
                        if (location.pathname.includes("assistenza"))
                            SETtoselect("assistenza")
                        else {
                            if (location.pathname.includes("faq"))
                                SETtoselect("faq")
                            else {
                                if (location.pathname.includes("dashboard"))
                                    SETtoselect("dashboard")
                                else {
                                    if (location.pathname.includes("leadwhatsapp"))
                                        SETtoselect("leadwhatsapp")
                                    else
                                        SETtoselect("customers")
                                }

                            }
                        }
                    }
                }
            }

    }, [location.pathname])


    document.querySelectorAll("li.c").forEach(li => li.addEventListener("click", (e) => {
        const anchor = e.currentTarget.querySelector('a');
        if (anchor) {
            anchor.click();
        }
    }));

    const openLinkInNewTab = () => {
        window.open('https://leadsystem.gitbook.io/guida');
        //newWindow.focus();
      };

    return (
        <div className={active ? 'header header-spa' : 'header-mobile'} style={{zIndex:headerIndex}}>
            {/*<div className='menu-icon' onClick={activateNav} style={active ? {margin: '10px', gap: '3.5rem' } : null}>
            <h2>{active ? state.user.name : null}</h2>
                {!active ? <IoMdMenu className='menu' /> : <IoMdMenu className='menu' />}
            </div>*/}
            <div className='sidebar-super-admin-top'>
                <div className='spa-top-left'>
                    <img src={logo} />
                </div>
                <div className='spa-top-right'>
                    <p>Log out <BsChevronRight /></p>
                </div>
            </div>
            <nav className='nav-super-admin'>
                <ul className={active ? 'ul-item' : 'ul-item oicon'}>
                    <div className='middle-sidebar middle-sidebar-super-admin'>
                    {/*<h2>{!active ? state.user.name : null}</h2>*/}

                    <li className={(toselect == "customers") ? "selected spa-normal c" : 'spa-normal c'} >
                            <Link to='/super-admin/dash-marketing'>
                                <div>
                                    <img src={sidebar1} />
                                    <span>
                                        Dashboard marketing
                                    </span>  
                                </div>
                                <BsChevronRight className='icon-arrow' />
                            </Link>
                        </li>
                        <li className={(toselect == "dashboard") ? "selected spa-normal c" : 'spa-normal c'} >
                            <Link to='/super-admin/home '>
                                <div>
                                    <img src={sidebar1} />
                                    <span>
                                        Controllo organizzazioni
                                    </span>   
                                </div>

                                <BsChevronRight className='icon-arrow' />
                            </Link>
                        </li>

                        {/*<p id='gestione'>Gestione</p>*/}
                    </div>


                    <div className='bottom-sidebar bottom-sidebar-super-admin'>
                        <li className={(toselect == "assistenza") ? "selectedBlue c" : 'c'}>
                            <Link to='/assistenza'>
                                <span>
                                    Assistenza
                                </span>
                                <BsChevronRight className='bottom-icon-arrow' />
                            </Link>
                        </li>
                        <li className={(toselect == "impostazioni") ? "selectedBlue c" : 'c'}>
                            <Link to='/impostazioni'>
                                <span>
                                    Impostazioni
                                </span>
                                <BsChevronRight className='bottom-icon-arrow' />
                            </Link>
                        </li>
                        <li className={(toselect == "assistenza") ? "selectedBlue c" : 'c'}>
                            <Link to='/assistenza'>
                                <span>
                                    Faq
                                </span>
                                <BsChevronRight className='bottom-icon-arrow' />
                            </Link>
                        </li>
                    </div>
                </ul>
                <div className='bottom-bottom-spa'>
                    <div>
                      <span>UP</span>
                      <span>K</span>
                      <BsChevronDown />
                    </div>
                    <FaQuestionCircle />
                </div>
            </nav>
        </div>
    )
}

export default SidebarSuperAdmin