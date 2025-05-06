"use client";
import Image from "next/image";
import NetFlowPieChart from "../../components/charts/PieChart";

import {
  Button,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
} from "@mui/material";

import {
  DateTimeField,
  LocalizationProvider,
  DateTimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/cs";

import { Metric, ProtocolType } from "@/lib/netFlowTypes";
import { useEffect, useState } from "react";

export default function Home() {
  const [metric, setMetric] = useState<Metric>("bytes");
  const [protocolType, setProtocolType] = useState<ProtocolType>("low");
  const [dateStart, setDateStart] = useState<Dayjs>(dayjs().subtract(7, "day"));
  const [dateEnd, setDateEnd] = useState<Dayjs>(dayjs());

  useEffect(() => {
    if (dateStart.isAfter(dateEnd)) setDateEnd(dateStart);
    console.log(dateStart);
  }, [dateStart]);

  useEffect(() => {
    if (dateEnd.isBefore(dateStart)) setDateStart(dateEnd);
    console.log(dateEnd);
  }, [dateEnd]);

  const handleMetricChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMetric = event.target.value as Metric;
    setMetric(newMetric);
  };

  const handleProtocolTypeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newProtocolType = event.target.value as ProtocolType;
    setProtocolType(newProtocolType);
  };

  const handleDateStartChange = (newValue: Dayjs | null) => {
    if (newValue) {
      setDateStart(newValue);
    }
  };

  const handleDateEndChange = (newValue: Dayjs | null) => {
    if (newValue) {
      setDateEnd(newValue);
    }
  };

  const onStartDateChange = (date: Date) => {
    setDateStart(dayjs(date));
  };
  const onEndDateChange = (date: Date) => {
    setDateEnd(dayjs(date));
  };

  return (
    <main className="h-screen w-screen bg-white">
      <div className="flex flex-row gap-4 py-3 items-center justify-center"></div>
      <div className="flex flex-col items-center justify-center">
        <NetFlowPieChart
          protocolType={protocolType}
          metric={metric}
          startDate={dateStart.toDate()}
          endDate={dateEnd.toDate()}
        />
        <div className="flex flex-row gap-4 items-center justify-center text-black">
          <RadioGroup
            onChange={handleMetricChange}
            value={metric}
            name="radio-buttons-group"
          >
            <FormControlLabel
              value="bytes"
              control={<Radio />}
              label="Bytes"
            />
            <FormControlLabel
              value="packets"
              control={<Radio />}
              label="Packets"
            />
          </RadioGroup>
          <RadioGroup
            onChange={handleProtocolTypeChange}
            value={protocolType}
            name="radio-buttons-group"
            // style={{ color:"black"}}
          >
            <FormControlLabel
              value="low"
              control={<Radio />}
              label="3. Layer"
            />
            <FormControlLabel
              value="app"
              control={<Radio />}
              label="4. Layer"
            />
          </RadioGroup>

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="cs">
            <DateTimePicker
              label="Start"
              value={dateStart}
              onChange={handleDateStartChange}
              maxDateTime={dayjs()}
            />
            <DateTimePicker
              label="End"
              value={dateEnd}
              onChange={handleDateEndChange}
              maxDateTime={dayjs()}
            />
          </LocalizationProvider>
        </div>
      </div>
    </main>
    /* <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        
      </footer> */
  );
}
