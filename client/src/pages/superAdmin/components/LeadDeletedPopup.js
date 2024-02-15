import React from "react"

const LeadDeletedPopup = ({setLeadDeletedPopup, leadDeleted}) => {


    return (
      <div className='scheda-ecp-popup-super'>
          <div className='top-popup-super-scheda-ecp'>
            <p onClick={setLeadDeletedPopup}>X</p>
            <h4>Lead Cancellati</h4>
          </div>
        <div className='table-home-super' style={{width: '95%', maxHeight: '100%', overflowY: 'scroll'}}>
        <table aria-label="simple table" className="table-container">
          <thead style={{ zIndex: '5', position: 'sticky', top: '-50px' }}>
            <tr className='tr-super-thead'>
              <th style={{ fontWeight: "600" }}>Nome</th>
              <th style={{ fontWeight: "600" }}>Email</th>
              <th style={{ fontWeight: "600" }}>Telefono</th>
              <th style={{ fontWeight: "600" }}>Ecp</th>
            </tr>
          </thead>

          <tbody style={{ color: "white", textAlign: 'left' }} className="table-body-container" id="table2lista">
            {leadDeleted && leadDeleted
              .map((row) => (
                <tr className='tr-home-super' key={row._id} style={{margin: '10px 0'}}>
                  <td>{row.nome + ' ' + row.cognome}</td>
                  <td>{row.email}</td>
                  <td>{row.numeroTelefono}</td>
                  <td>
                    {row.utente.nameECP}
                  </td>   
                </tr>
              ))}
          </tbody>


        </table>
        </div>
      </div>

    )
  }

  export default LeadDeletedPopup; 