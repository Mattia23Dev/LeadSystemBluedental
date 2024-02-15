import React from "react";

const Input = ({ label, value, setValue, type = "text", placeholder }) => (
  <div className="mb-4" style={{textAlign: 'left'}}>
    <span style={{fontSize: '16px'}}>{label}</span>
    <input
      type={type}
      onChange={(e) => setValue(e.target.value)}
      value={value}
      placeholder={placeholder}
      className="form-control"
      style={{border: 'none', marginBottom: '10px', borderBottom: '1px solid black', borderRadius: 0, fontSize: '13px'}}
    />
  </div>
);

export default Input;
