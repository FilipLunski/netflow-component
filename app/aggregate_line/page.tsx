"use client";
import NetFlowLineChart from "@/components/charts/LineChart";
import { Granularity, granularityMap, Metric } from "@/lib/netFlowTypes";
import {
  Button,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DateTimeField, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

const granularities: Granularity[] = ["1m", "5m", "30m", "1h", "12h", "1d"];


export default function Home() {
  const [granularity, setGranularity] = useState<Granularity>("1h");
  const [metric, setMetric] = useState<Metric>("volume");
  const [dateStart, setDateStart] = useState<Dayjs>(
    dayjs().subtract(
      granularityMap[granularity].minutes * (granularityMap[granularity].maxSpan - 1),
      "minute"
    )
  );
  const [dateEnd, setDateEnd] = useState<Dayjs>(dayjs());

  const handleGranularityChange = (event: SelectChangeEvent) => {
    const newGranularity = event.target.value as Granularity;
    setGranularity(newGranularity);
  };

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

  const onStartDateChange = (date: Date) => {
    setDateStart(dayjs(date));
  };
  const onEndDateChange = (date: Date) => {
    setDateEnd(dayjs(date));
  };

  useEffect(() => {
    if (dateStart.isAfter(dateEnd)) {
      setDateEnd(dateStart);
    } else if (
      dateEnd.diff(dateStart, "minute") >
      granularityMap[granularity].minutes * granularityMap[granularity].maxSpan
    ) {
      setDateEnd(
        dateStart.add(
          granularityMap[granularity].minutes * (granularityMap[granularity].maxSpan - 1),
          "minute"
        )
      );
    }
    console.log(dateStart);
  }, [dateStart]);

  useEffect(() => {
    if (dateEnd.isBefore(dateStart)) {
      setDateStart(dateEnd);
    } else if (
      dateEnd.diff(dateStart, "minute") >
      granularityMap[granularity].minutes * granularityMap[granularity].maxSpan
    ) {
      setDateStart(
        dateEnd.subtract(
          granularityMap[granularity].minutes * (granularityMap[granularity].maxSpan - 1),
          "minute"
        )
      );
    }
    console.log(dateEnd);
  }, [dateEnd]);

  useEffect(() => {
    if (
      dateEnd.diff(dateStart, "minute") >
      granularityMap[granularity].minutes * granularityMap[granularity].maxSpan
    ) {
      setDateStart(
        dateEnd.subtract(
          granularityMap[granularity].minutes * (granularityMap[granularity].maxSpan - 1),
          "minute"
        )
      );
    }
  }, [granularity]);

  const handleNextClick = () => {
    const newStartDate = dateStart.add(dateEnd.diff(dateStart, "minute")/2, "minute");
    const newEndDate = dateEnd.add(dateEnd.diff(dateStart, "minute")/2, "minute");
    setDateStart(newStartDate);
    setDateEnd(newEndDate);
  };

  const handlePrevClick = () => {
    const newStartDate = dateStart.subtract(dateEnd.diff(dateStart, "minute")/2, "minute");
    const newEndDate = dateEnd.subtract(dateEnd.diff(dateStart, "minute")/2, "minute");
    setDateStart(newStartDate);
    setDateEnd(newEndDate);
  };

  return (
    <main className="h-screen w-screen bg-white">
      <div className="flex flex-row items-center justify-center">
        <Button variant="contained" className="mx-2" onClick={handlePrevClick}>PREV</Button>
        <Button variant="contained" className="mx-2" onClick={handleNextClick} >NEXT</Button>
        </div>
      <div className="flex flex-col items-center justify-center">
        <NetFlowLineChart
          granularity={granularity}
          metric={metric}
          startDate={dateStart.toDate()}
          endDate={dateEnd.toDate()}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
        />
        <div className="flex flex-row items-center justify-center">
          <RadioGroup
            aria-labelledby="demo-radio-buttons-group-label"
            onChange={handleMetricChange}
            value={metric}
            name="radio-buttons-group"
          >
            <FormControlLabel
              value="volume"
              control={<Radio />}
              label="Volume"
            />
            <FormControlLabel
              value="count"
              control={<Radio />}
              label="Flows count"
            />
          </RadioGroup>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={granularity}
            label="Age"
            onChange={handleGranularityChange}
          >
            {Object.entries(granularityMap).map(([key, value]) => {
              return (
                <MenuItem value={key}>
                  {`${value.binSize} ${value.unit}${
                    value.binSize > 1 ? "s" : ""
                  }`}
                </MenuItem>
              );
            })}
          </Select>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
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
