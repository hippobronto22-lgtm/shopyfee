import csv
import json

csv_file = 'shopee_fees.csv'
json_file = 'shopee_fees.json'

data = []
with open(csv_file, mode='r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader) # Skip header
    for row in reader:
        if len(row) < 5:
            continue
        status_toko = row[0].strip()
        kategori = row[1].strip()
        sub_kategori = row[2].strip()
        jenis_produk = row[3].strip()
        try:
            # Handle potential non-numeric strings or empty values
            fee_str = row[4].strip().replace('%', '').replace(',', '.')
            fee = float(fee_str) if fee_str else 0.0
        except ValueError:
            fee = 0.0
        
        if status_toko and kategori: # Basic validation
            data.append({
                "statusToko": status_toko,
                "kategori": kategori,
                "subKategori": sub_kategori,
                "jenisProduk": jenis_produk,
                "fee": fee
            })

with open(json_file, mode='w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Successfully converted {len(data)} rows to {json_file}")
