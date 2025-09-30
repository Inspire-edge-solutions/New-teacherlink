import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const WheelDatePicker = ({ 
  value, 
  onChange, 
  placeholder = "Select Date",
  minYear = new Date().getFullYear() - 80,
  maxYear = new Date().getFullYear() 
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [wheelDay, setWheelDay] = useState(15);
  const [wheelMonth, setWheelMonth] = useState(6);
  const [wheelYear, setWheelYear] = useState(1995);

  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const isScrollingRef = useRef(false);

  // Generate arrays for wheel picker - memoized to prevent re-creation
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const months = useMemo(() => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], []);
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i), [maxYear, minYear]);

  // Parse existing date into wheel values
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setWheelDay(date.getDate());
        setWheelMonth(date.getMonth() + 1);
        setWheelYear(date.getFullYear());
      }
    }
  }, [value]);

  // Optimized scroll handlers
  const handleDayScroll = useCallback((e) => {
    if (isScrollingRef.current) return;
    const scrollTop = e.target.scrollTop;
    const itemHeight = 40;
    const selectedIndex = Math.round(scrollTop / itemHeight);
    const newDay = selectedIndex + 1;
    if (newDay >= 1 && newDay <= 31 && newDay !== wheelDay) {
      setWheelDay(newDay);
    }
  }, [wheelDay]);

  const handleMonthScroll = useCallback((e) => {
    if (isScrollingRef.current) return;
    const scrollTop = e.target.scrollTop;
    const itemHeight = 40;
    const selectedIndex = Math.round(scrollTop / itemHeight);
    const newMonth = selectedIndex + 1;
    if (newMonth >= 1 && newMonth <= 12 && newMonth !== wheelMonth) {
      setWheelMonth(newMonth);
    }
  }, [wheelMonth]);

  const handleYearScroll = useCallback((e) => {
    if (isScrollingRef.current) return;
    const scrollTop = e.target.scrollTop;
    const itemHeight = 40;
    const selectedIndex = Math.round(scrollTop / itemHeight);
    const newYear = years[selectedIndex];
    if (newYear && newYear !== wheelYear) {
      setWheelYear(newYear);
    }
  }, [wheelYear, years]);

  // Position wheels when modal opens
  useEffect(() => {
    if (showDatePicker) {
      isScrollingRef.current = true;
      setTimeout(() => {
        if (dayRef.current) {
          dayRef.current.scrollTop = (wheelDay - 1) * 40;
        }
        if (monthRef.current) {
          monthRef.current.scrollTop = (wheelMonth - 1) * 40;
        }
        if (yearRef.current) {
          const yearIndex = years.findIndex(y => y === wheelYear);
          yearRef.current.scrollTop = yearIndex * 40;
        }
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 200);
      }, 100);
    }
  }, [showDatePicker]);

  // Handle date picker actions
  const handleDatePickerSet = useCallback(() => {
    const dateString = `${wheelYear}-${wheelMonth.toString().padStart(2, '0')}-${wheelDay.toString().padStart(2, '0')}`;
    onChange(dateString);
    setShowDatePicker(false);
  }, [wheelYear, wheelMonth, wheelDay, onChange]);

  const handleDatePickerClear = useCallback(() => {
    onChange("");
    setWheelDay(15);
    setWheelMonth(6);
    setWheelYear(1995);
    setShowDatePicker(false);
  }, [onChange]);

  // Click handlers for direct selection
  const handleDayClick = useCallback((day) => {
    isScrollingRef.current = true;
    setWheelDay(day);
    if (dayRef.current) {
      dayRef.current.scrollTop = (day - 1) * 40;
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  }, []);

  const handleMonthClick = useCallback((monthIndex) => {
    isScrollingRef.current = true;
    setWheelMonth(monthIndex);
    if (monthRef.current) {
      monthRef.current.scrollTop = (monthIndex - 1) * 40;
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  }, []);

  const handleYearClick = useCallback((year) => {
    isScrollingRef.current = true;
    setWheelYear(year);
    if (yearRef.current) {
      const yearIndex = years.findIndex(y => y === year);
      yearRef.current.scrollTop = yearIndex * 40;
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  }, [years]);

  return (
    <>
      {/* CSS for hiding scrollbars */}
      <style>
        {`
          .wheel-scroll::-webkit-scrollbar {
            display: none;
          }
          .wheel-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      
      {/* Input Field */}
      <div 
        onClick={() => setShowDatePicker(true)}
        style={{
          width: "100%",
          padding: "12px 15px",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          backgroundColor: "#fff",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: "45px"
        }}
      >
        <span style={{ color: value ? "#333" : "#999" }}>
          {value 
            ? new Date(value).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long", 
                day: "numeric"
              })
            : placeholder
          }
        </span>
        <span style={{ color: "#666", fontSize: "18px" }}>📅</span>
      </div>
      
      {/* Wheel Date Picker Modal */}
      {showDatePicker && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "0",
            width: "320px",
            maxWidth: "90vw",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)"
          }}>
            {/* Header */}
            <div style={{
              padding: "20px",
              borderBottom: "1px solid #e0e0e0",
              backgroundColor: "#f8f9fa",
              borderRadius: "12px 12px 0 0"
            }}>
              <h3 style={{ 
                margin: 0, 
                color: "#1967D2", 
                fontSize: "18px",
                fontWeight: "500"
              }}>
                Pick a date
              </h3>
            </div>
            
            {/* Wheel Pickers */}
            <div style={{ 
              padding: "20px",
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              position: "relative"
            }}>
              {/* Selection Lines */}
              <div style={{
                position: "absolute",
                left: "20px",
                right: "20px",
                top: "50%",
                transform: "translateY(-50%)",
                height: "40px",
                borderTop: "2px solid #1967D2",
                borderBottom: "2px solid #1967D2",
                backgroundColor: "rgba(25, 103, 210, 0.1)",
                pointerEvents: "none",
                zIndex: 2
              }}></div>

              {/* Day Wheel */}
              <div style={{ flex: 1, position: "relative" }}>
                <div 
                  ref={dayRef}
                  className="wheel-scroll"
                  style={{
                    height: "150px",
                    overflowY: "scroll"
                  }}
                  onScroll={handleDayScroll}
                >
                  <div style={{ height: "55px" }}></div>
                  {days.map(day => (
                    <div
                      key={day}
                      style={{
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "18px",
                        fontWeight: wheelDay === day ? "600" : "400",
                        color: wheelDay === day ? "#1967D2" : "#666",
                        cursor: "pointer"
                      }}
                      onClick={() => handleDayClick(day)}
                    >
                      {day}
                    </div>
                  ))}
                  <div style={{ height: "55px" }}></div>
                </div>
              </div>
              
              {/* Month Wheel */}
              <div style={{ flex: 1, position: "relative" }}>
                <div 
                  ref={monthRef}
                  className="wheel-scroll"
                  style={{
                    height: "150px",
                    overflowY: "scroll"
                  }}
                  onScroll={handleMonthScroll}
                >
                  <div style={{ height: "55px" }}></div>
                  {months.map((month, index) => (
                    <div
                      key={index + 1}
                      style={{
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: wheelMonth === index + 1 ? "600" : "400",
                        color: wheelMonth === index + 1 ? "#1967D2" : "#666",
                        cursor: "pointer"
                      }}
                      onClick={() => handleMonthClick(index + 1)}
                    >
                      {month}
                    </div>
                  ))}
                  <div style={{ height: "55px" }}></div>
                </div>
              </div>
              
              {/* Year Wheel */}
              <div style={{ flex: 1, position: "relative" }}>
                <div 
                  ref={yearRef}
                  className="wheel-scroll"
                  style={{
                    height: "150px",
                    overflowY: "scroll"
                  }}
                  onScroll={handleYearScroll}
                >
                  <div style={{ height: "55px" }}></div>
                  {years.map((year, index) => (
                    <div
                      key={year}
                      style={{
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: wheelYear === year ? "600" : "400",
                        color: wheelYear === year ? "#1967D2" : "#666",
                        cursor: "pointer"
                      }}
                      onClick={() => handleYearClick(year)}
                    >
                      {year}
                    </div>
                  ))}
                  <div style={{ height: "55px" }}></div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{
              display: "flex",
              borderTop: "1px solid #e0e0e0"
            }}>
              <button
                onClick={() => setShowDatePicker(false)}
                style={{
                  flex: 1,
                  padding: "15px",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "16px",
                  color: "#666",
                  cursor: "pointer",
                  borderRight: "1px solid #e0e0e0"
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDatePickerClear}
                style={{
                  flex: 1,
                  padding: "15px",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "16px",
                  color: "#666",
                  cursor: "pointer",
                  borderRight: "1px solid #e0e0e0"
                }}
              >
                Clear
              </button>
              <button
                onClick={handleDatePickerSet}
                style={{
                  flex: 1,
                  padding: "15px",
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "16px",
                  color: "#1967D2",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WheelDatePicker; 