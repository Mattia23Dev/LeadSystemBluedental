import * as React from "react";
import { useState, useEffect, useContext } from "react";
import './Table2.scss';
import './TableAdmin.scss';
import { DatePicker } from "antd";
import { UserContext } from '../../context';
import axios from "axios";
import PopupModify from "./popupModify/PopupModify";
import { IoIosArrowDown } from 'react-icons/io';
import { SyncOutlined } from "@ant-design/icons";


const makeStyle = (status) => {
  if (status === 'Approved') {
    return {
      background: 'rgb(145 254 159 / 47%)',
      color: 'green',
    }
  }
  else if (status === 'Pending') {
    return {
      background: '#ffadad8f',
      color: 'red',
    }
  }
  else {
    return {
      background: '#59bfff',
      color: 'white',
    }
  }
}

export default function TableEcp({ search, startDate, endDate }) {
  const [state, setState] = useContext(UserContext);
  const [filterValue, setFilterValue] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [esitoOpen, setEsitoOpen] = useState(false);
  // const [startDate, setStartDate] = useState(null);
  // const [endDate, setEndDate] = useState(null);
  const [originalData, setOriginalData] = useState([]);
  const [popupModify, setPopupModify] = useState(false);
  const [selectedLead, setSelectedLead] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const [selectedStatusEsito, setSelectedStatusEsito] = useState({
    approved: false,
    pending: false,
    rejected: false,
    contacted: false,
    notContacted: false,
    noAnswer: false,
  });

  const toggleFilter = (filter) => {
    setSelectedStatusEsito((prevFilters) => ({
      ...prevFilters,
      [filter]: !prevFilters[filter],
    }));
  };

  useEffect(() => {
    setIsLoading(true);
    const fetchLeads = async () => {
      try {
        const response = await axios.get('/getAllLeads-admin');

        const filteredTableLead = response.data.map((lead) => {
          const telephone = lead.numeroTelefono ? lead.numeroTelefono.toString() : '';
          const cleanedTelephone =
            telephone.startsWith('+39') && telephone.length === 13
              ? telephone.substring(3)
              : telephone;


          return {
            name: lead.nome,
            surname: lead.cognome,
            email: lead.email,
            date: lead.data,
            telephone: cleanedTelephone,
            status: lead.esito,
            orientatore: lead.orientatori ? lead.orientatori.nome + ' ' + lead.orientatori.cognome : '',
            facoltà: lead.facolta ? lead.facolta : '',
            fatturato: lead.fatturato ? lead.fatturato : '',
            università: lead.università ? lead.università : '',
            campagna: lead.campagna,
            corsoDiLaurea: lead.corsoDiLaurea ? lead.corsoDiLaurea : '',
            oreStudio: lead.oreStudio ? lead.oreStudio : '',
            provincia: lead.provincia ? lead.provincia : '',
            note: lead.note ? lead.note : '',
            id: lead._id,
            fequentiUni: lead.frequentiUni ? lead.fequentiUni : false,
          };
        });
        setFilteredData(filteredTableLead);
        setOriginalData(filteredTableLead);
        localStorage.setItem('table-lead', JSON.stringify(filteredTableLead));
        setIsLoading(false);
      } catch (error) {
        console.error(error);
      }
    };

    fetchLeads();
  }, []);


  function handleFilterChange(event) {
    setSelectedFilter(event.target.value);

    // Apri il popup corretto in base all'opzione selezionata
    switch (event.target.value) {
      case "data":
        setCalendarOpen(true);
        document.body.classList.add("overlay");
        break;
      case "esito":
        setEsitoOpen(true);
      default:
        break;
    }
  }

  const handleNameChange = (event) => {
    setFilterValue(event.target.value);
  };

  useEffect(() => {
    const filteredDataIn = filteredData.filter((row) => {
      const filterNum = parseInt(filterValue);
      if (!isNaN(filterNum)) {
        return typeof row.telephone === 'string' && row.telephone.startsWith(filterValue);
      } else {
        return row.name && row.name.toLowerCase().startsWith(filterValue.toLowerCase());
      }
    }).map((row) => {
      // Crea una nuova array contenente solo gli oggetti che soddisfano il criterio di ricerca
      return {
        name: row.name,
        surname: row.surname,
        date: row.date,
        telephone: row.telephone,
        status: row.status,
        orientatore: row.orientatore,
      };
    });
    setFilteredData(filteredDataIn);
  }, [filterValue])

  useEffect(() => {
    if (filterValue === '') {
      setFilteredData(originalData);
    }
  }, [filterValue]);

  const formatDate = (originalDate) => {
    const formattedDate = new Date(originalDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = new Date(originalDate).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const finalFormat = `${formattedDate} ${formattedTime}`;
    return finalFormat;
  }

  return (
    <div className="Table-admin">

      {/* {popupModify &&
        <PopupModify
          onClose={handleClosePopup}
          lead={selectedLead}
          setPopupModify={() => setPopupModify(false)}
        />
      } */}

      {isLoading ?
        <div
          className="d-flex justify-content-center fw-bold"
          style={{ height: "90vh" }}
        >
          <div className="d-flex align-items-center">
            <SyncOutlined spin style={{ fontSize: "50px" }} />
          </div>
        </div>
        :
        <div style={{ boxShadow: "0px 0px 20px 2px #80808029", borderRadius: '20px', padding: '30px 20px', maxHeight: '20vh' }} className="table-big-container-admin">
          <div id="oftable">

            <table style={{ minWidth: '85%' }} aria-label="simple table" className="table-container">
              <thead style={{ top: 0 }}>
                <tr>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px' }}>Nome</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px' }}>Cognome</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px' }}>Data e ora</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px' }}>Telefono</th>
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px' }}>Esito</th>
                  {/* <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px' }}>Dati cliente</th> */}
                  <th style={{ color: 'rgba(0, 0, 0, 0.31)', fontSize: '25px' }}>Orientatore</th>
                </tr>
              </thead>
              <tbody style={{ color: "white", textAlign: 'left' }} className="table-body-container">
                {filteredData && filteredData
                  .filter(row =>
                    row.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
                    row.surname.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
                    row.orientatore.toLocaleLowerCase().includes(search.toLocaleLowerCase()) ||
                    row.telephone.toLocaleLowerCase().includes(search.toLocaleLowerCase())
                  )
                  .filter(p => {
                    let flag = true
                    if (startDate)
                      flag = new Date(p.date) >= new Date(startDate)

                    if (endDate)
                      flag = flag && new Date(p.date) <= new Date(endDate)

                    return flag
                  })
                  .sort((a, b) => new Date(a.date) < new Date(b.date) ? 1 : -1)
                  .map((row, index) => (
                    <tr key={index}>
                      <td>{row.name}</td>
                      <td>{row.surname}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.telephone}</td>
                      <td>
                        <div className={"status " + row.status}>{row.status}</div>
                      </td>
                      {/* <td className="modify-table" onClick={() => handleModifyPopup(index)}>Modifica <IoIosArrowDown size={12} /></td> */}
                      <td className="Details">{row.orientatore}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

          </div>

        </div>
      }
    </div>
  );
}