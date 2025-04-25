import socket
import struct
import datetime
from collections import defaultdict
import json
import ipaddress
from pymongo import MongoClient
from bson import BSON, json_util
import time

client = MongoClient("mongodb://10.0.1.40:27017/")

# Create or access a database
db = client["netflow_db"]

# Create or access a collection
packets = db["netflow_packets"]
records_collection = db["netflow_records"]
templates_collection = db["netflow_templates"]


# Configuration
LISTEN_IP = "0.0.0.0"
LISTEN_PORT = 2055
BUFFER_SIZE = 8192

file_path = "./netflow_data2.json"  # File to store NetFlow data

# Templates storage
# { source_id: { template_id: [(field_type, field_length), ...] } }
templates = defaultdict(dict)

# Field type dictionary (for readability; not exhaustive)
FIELD_TYPES = {
    1: "IN_BYTES",
    2: "IN_PKTS",
    3: "FLOWS",
    4: "PROTOCOL",
    5: "SRC_TOS",
    6: "TCP_FLAGS",
    7: "L4_SRC_PORT",
    8: "IPV4_SRC_ADDR",
    9: "SRC_MASK",
    10: "INPUT_SNMP",
    11: "L4_DST_PORT",
    12: "IPV4_DST_ADDR",
    13: "DST_MASK",
    14: "OUTPUT_SNMP",
    15: "IPV4_NEXT_HOP",
    16: "SRC_AS",
    17: "DST_AS",
    18: "BGP_IPV4_NEXT_HOP",
    19: "MUL_DST_PKTS",
    20: "MUL_DST_BYTES",
    21: "LAST_SWITCHED",
    22: "FIRST_SWITCHED",
    23: "OUT_BYTES",
    24: "OUT_PKTS",
    25: "MIN_PKT_LNGTH",
    26: "MAX_PKT_LNGTH",
    27: "IPV6_SRC_ADDR",
    28: "IPV6_DST_ADDR",
    29: "IPV6_SRC_MASK",
    30: "IPV6_DST_MASK",
    31: "IPV6_FLOW_LABEL",
    32: "ICMP_TYPE",
    33: "MUL_IGMP_TYPE",
    34: "SAMPLING_INTERVAL",
    35: "SAMPLING_ALGORITHM",
    36: "FLOW_ACTIVE_TIMEOUT",
    37: "FLOW_INACTIVE_TIMEOUT",
    38: "ENGINE_TYPE",
    39: "ENGINE_ID",
    40: "TOTAL_BYTES_EXP",
    41: "TOTAL_PKTS_EXP",
    42: "TOTAL_FLOWS_EXP",
    44: "IPV4_SRC_PREFIX",
    45: "IPV4_DST_PREFIX",
    46: "MPLS_TOP_LABEL_TYPE",
    47: "MPLS_TOP_LABEL_IP_ADDR",
    48: "FLOW_SAMPLER_ID",
    49: "FLOW_SAMPLER_MODE",
    50: "FLOW_SAMPLER_RANDOM_INTERVAL",
    52: "MIN_TTL",
    53: "MAX_TTL",
    54: "IPV4_IDENT",
    55: "DST_TOS",
    56: "IN_SRC_MAC",
    57: "OUT_DST_MAC",
    58: "SRC_VLAN",
    59: "DST_VLAN",
    60: "IP_PROTOCOL_VERSION",
    61: "DIRECTION",
    62: "IPV6_NEXT_HOP",
    63: "BPG_IPV6_NEXT_HOP",
    64: "IPV6_OPTION_HEADERS",
    70: "MPLS_LABEL_1",
    71: "MPLS_LABEL_2",
    72: "MPLS_LABEL_3",
    73: "MPLS_LABEL_4",
    74: "MPLS_LABEL_5",
    75: "MPLS_LABEL_6",
    76: "MPLS_LABEL_7",
    77: "MPLS_LABEL_8",
    78: "MPLS_LABEL_9",
    79: "MPLS_LABEL_10",
    80: "IN_DST_MAC",
    81: "OUT_SRC_MAC",
    82: "IF_NAME",
    83: "IF_DESC",
    84: "SAMPLER_NAME",
    85: "IN_PERMANENT_BYTES",
    86: "IN_PERMANENT_PKTS",
}


converters = {
    1: lambda x: struct.unpack("!I", x)[0],  # IN_BYTES
    2: lambda x: struct.unpack("!I", x)[0],  # IN_PKTS
    4: lambda x: x[0],  # PROTOCOL
    5: lambda x: x[0],  # SRC_TOS
    7: lambda x: struct.unpack("!H", x)[0],  # L4_SRC_PORT
    8: lambda x: str(ipaddress.ip_address(x)),  # IPV4_SRC_ADDR
    10: lambda x: struct.unpack("!I", x)[0],  # INPUT_SNMP
    11: lambda x: struct.unpack("!H", x)[0],  # L4_DST_PORT
    12: lambda x: str(ipaddress.ip_address(x)),  # IPV4_DST_ADDR
    14: lambda x: struct.unpack("!I", x)[0],  # OUTPUT_SNMP
    15: lambda x: str(ipaddress.ip_address(x)),  # IPV4_NEXT_HOP
    21: lambda x: struct.unpack("!I", x)[0],  # LAST_SWITCHED
    22: lambda x: struct.unpack("!I", x)[0],  # FIRST_SWITCHED
    32: lambda x: str(ipaddress.ip_address(x)),  # SRC_MASK
    33: lambda x: str(ipaddress.ip_address(x)),  # DST_MASK
    34: lambda x: str(ipaddress.ip_address(x)),  # IPV6_SRC_ADDR
    36: lambda x: str(ipaddress.ip_address(x)),  # IPV6_DST_ADDR
    61: lambda x: x[0]  # DIRECTION
}


def parse_header(data):
    header_fields = struct.unpack("!HHIIII", data[:20])
    return {
        "version": header_fields[0],
        "count": header_fields[1],
        "sys_uptime": datetime.timedelta(milliseconds=header_fields[2]).__str__(),
        "sys_uptime_millis": header_fields[2],
        "timestamp": datetime.datetime.fromtimestamp(header_fields[3]),
        "timestamp_secs": header_fields[3],
        "sequence_number": header_fields[4],
        "source_id": header_fields[5],
        "flowsets": []
    }


def parse_template_flowset(data, source_id, timestamp=time.time()):
    flowset_id, length = struct.unpack("!HH", data[:4])
    templates = {}
    offset = 4
    while offset < length:
        if offset + 4 > length:
            break
        template_id, field_count = struct.unpack("!HH", data[offset:offset+4])
        offset += 4
        fields = []
        for _ in range(field_count):
            if offset + 4 > length:
                break
            field_type, field_length = struct.unpack(
                "!HH", data[offset:offset+4])
            fields.append((field_type, field_length))
            offset += 4
        templates[str(template_id)] = fields
    t = templates_collection.find_one({"_id": source_id})
    if t:
        temp = t["templates"]
        temp.update(templates)
    else:
        temp = templates
    templates_collection.replace_one({"_id": source_id},{
        "_id": source_id,
        "time_update": timestamp,
        "templates": temp,
    }, upsert=True)
    return templates


def parse_data_flowset(data, templates, source_id, timestamp_secs=int(time.time()), sys_uptime=0):
    flowset_id, length = struct.unpack("!HH", data[:4])
    template = templates.get(str(source_id), {}).get(str(flowset_id))
    if not template:
        t = templates_collection.find_one({"_id": source_id})
        if t: 
            template = t["templates"].get(str(flowset_id))
        if not template:
            return {"flowset_id": flowset_id, "error": "Template not found", "data": data.hex()}

    records = []
    offset = 4
    record_size = sum(field[1] for field in template)
    while offset + record_size <= length:
        record_data = data[offset:offset + record_size]
        record = {
            "template_id": flowset_id,
            "source_id": source_id,
        }
        idx = 0
        for field_type, field_length in template:
            raw_value = record_data[idx:idx + field_length]
            key = FIELD_TYPES.get(field_type, f"TYPE_{field_type}")
            if field_type in converters:
                value = converters[field_type](raw_value)
            elif field_length == 4:
                value = struct.unpack("!I", raw_value)[0]
            elif field_length == 2:
                value = struct.unpack("!H", raw_value)[0]
            elif field_length == 1:
                value = raw_value[0]
            elif field_length == 16:  # IPv6
                value = ":".join(
                    f"{raw_value[i]:02x}{raw_value[i+1]:02x}" for i in range(0, 16, 2))
            else:
                value = raw_value.hex()
            record[key] = value
            idx += field_length
        time_start = timestamp_secs - (sys_uptime - record["FIRST_SWITCHED"])/1000
        record["timestamp"] = datetime.datetime.fromtimestamp(time_start)
        record["timestamp_secs"] = time_start
        record["packet_time"] = datetime.datetime.fromtimestamp(timestamp_secs)
        records.append(record)
        offset += record_size
    
        
    records_collection.insert_many(records) 
    return {
        "flowset_id": flowset_id,
        "type": "data",
        "records": records}


def parse_packet(data, addr):
    header = parse_header(data)
    source_id = header["source_id"]
    offset = 20

    while offset < len(data):
        flowset_id, flowset_length = struct.unpack(
            "!HH", data[offset:offset+4])
        flowset_data = data[offset:offset+flowset_length]

        if flowset_id == 0: 
            print(";", end="", flush=True)
            new_templates = parse_template_flowset(flowset_data, source_id, header["timestamp"])
            templates[str(source_id)].update(new_templates)
            header["flowsets"].append({
                "flowset_id": flowset_id,
                "type": "template",
                "templates": new_templates
            })
        elif flowset_id >= 256:
            print(".", end="", flush=True)
            flowset = parse_data_flowset(flowset_data, templates, source_id, header["timestamp_secs"], header["sys_uptime_millis"])
            header["flowsets"].append(flowset)
        else:
            print("!", end="", flush=True)
            header["flowsets"].append({
                "flowset_id": flowset_id,
                "type": "unknown",
                "raw_data": flowset_data.hex()
            })

        offset += flowset_length

    return {
        "from": addr,
        "netflow_packet": header
    }


def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((LISTEN_IP, LISTEN_PORT))
    print(f"Listening for NetFlow v9 on {LISTEN_IP}:{LISTEN_PORT}...")

    while True:
        data, addr = sock.recvfrom(BUFFER_SIZE)
        try:
            parsed = parse_packet(data, addr)
            packets.insert_one(parsed["netflow_packet"])

        except Exception as e:
            print(f"Error parsing packet from {addr}: {e}")
            


if __name__ == "__main__":
    main()

