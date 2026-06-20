import React, { useState } from "react";

const OtpInput = ({ length, onChange }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));

  const handleChange = (element, index) => {
    const value = element.value.replace(/\D/g, "");
    if (!value) {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      onChange(newOtp.join(""));
      return;
    }

    const newOtp = [...otp];
    value
      .slice(0, length - index)
      .split("")
      .forEach((digit, digitIndex) => {
        newOtp[index + digitIndex] = digit;
      });
    setOtp(newOtp);
    onChange(newOtp.join(""));

    const nextIndex = Math.min(index + value.length, length - 1);
    if (index < length - 1) {
      document.getElementById(`otp-input-${nextIndex}`).focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);

    if (!pastedValue) return;

    const newOtp = new Array(length).fill("");
    pastedValue.split("").forEach((digit, index) => {
      newOtp[index] = digit;
    });
    setOtp(newOtp);
    onChange(newOtp.join(""));
    document
      .getElementById(`otp-input-${Math.min(pastedValue.length, length) - 1}`)
      .focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-input-${index - 1}`).focus();
    }
  };

  return (
    <div style={{ display: "flex", gap: "7px", justifyContent:'center' }} className="otpBox">
      {otp.map((data, index) => (
        <input
          key={index}
          id={`otp-input-${index}`}
          type="text"
          maxLength="1"
          value={otp[index]}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          style={{
            width: "45px",
            height: "45px",
            textAlign: "center",
            fontSize: "17px",
          }}
        />
      ))}
    </div>
  );
};

export default OtpInput;
