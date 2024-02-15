import React, { useState } from "react";
import { DatePicker, TimePicker, Button } from 'antd';
import { Switch } from "antd";
import Dropdown from "react-dropdown";
import "react-dropdown/style.css";

const options = [
    { value: "dateAndTime", label: "Data e Ora" },
    { value: "outcome", label: "Esito" },
    { value: "name", label: "Nome" },
    { value: "phone", label: "Telefono" }
  ];
  
  const OutcomeFilters = ({ onChange }) => {
    const [checked, setChecked] = useState(null);
  
    const handleChange = (checked) => {
      setChecked(checked);
      onChange(checked);
    };
  
    return (
      <div>
        <Switch checked={checked} onChange={handleChange} />
      </div>
    );
  };
  
  const NameAndPhoneFilters = ({ onChange }) => {
    const [searchText, setSearchText] = useState("");
  
    const handleSearchTextChange = (event) => {
      const text = event.target.value;
      setSearchText(text);
      onChange(text);
    };
  
    return (
      <div>
        <input
          type="text"
          value={searchText}
          onChange={handleSearchTextChange}
          placeholder="Cerca"
        />
      </div>
    );
  };
  
  const DropdownFilters = () => {
    const [selectedOption, setSelectedOption] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
    const handleDropdownClick = () => {
      setIsDropdownOpen(!isDropdownOpen);
    };
  
    const handleOptionSelect = (option) => {
      setSelectedOption(option);
      setIsDropdownOpen(false);
    };
  
    let popup = null;
  
    if (selectedOption && selectedOption.value === "dateAndTime") {
      popup = (
        <div>
          <DatePicker selected={new Date()} />
          <TimePicker />
        </div>
      );
    } else if (selectedOption && selectedOption.value === "outcome") {
      popup = <OutcomeFilters onChange={() => {}} />;
    } else if (selectedOption && (selectedOption.value === "name" || selectedOption.value === "phone")) {
      popup = <NameAndPhoneFilters onChange={() => {}} />;
    }
  
    return (
      <div className="dropdown-container" onClick={handleDropdownClick}>
        <span>Filtra</span>
        {isDropdownOpen && (
          <Dropdown
            options={options}
            value={selectedOption}
            onChange={handleOptionSelect}
          />
        )}
        {popup}
      </div>
    );
  };
  
  export default DropdownFilters;