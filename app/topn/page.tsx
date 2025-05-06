"use client";
import NetFlowBarChart from "@/components/charts/BarChart";

import {
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material";

import {
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
  const [dateStart, setDateStart] = useState<Dayjs>(dayjs().subtract(1, "months"));
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

  return (
    <main className="h-screen w-screen bg-white">
      <div className="flex flex-row gap-4 py-3 items-center justify-center"></div>
      <div className="flex flex-col items-center justify-center">
        <NetFlowBarChart
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
  );
}
