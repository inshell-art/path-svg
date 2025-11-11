#!/bin/bash
# Quick deploy helper for PATH_SVG on devnet

set -euo pipefail

RPC_URL="http://127.0.0.1:5050"
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"

echo "🔨 Building contract..."
cd "$CONTRACTS_DIR"
scarb build

echo ""
echo "📋 Contract built. To complete deployment:"
echo ""
echo "1️⃣  Get a predeployed account from devnet logs (when you started it with --seed 0)"
echo "   Look for: Account address: 0x... and Private key: 0x..."
echo ""
echo "2️⃣  Import the predeployed account:"
echo "   sncast account import --name predeployed --address <ADDRESS> --type open-zeppelin --private-key <PRIVATE_KEY> --url $RPC_URL"
echo ""
echo "3️⃣  Update snfoundry.toml to use it:"
echo "   account = \"predeployed\""
echo ""
echo "4️⃣  Declare the contract:"
echo "   cd $CONTRACTS_DIR && sncast --profile devnet declare --contract-name PATH_SVG"
echo ""
echo "5️⃣  Deploy the contract (use class hash from step 4 output):"
echo "   sncast --profile devnet deploy --class-hash <CLASS_HASH>"
echo ""
echo "6️⃣  Update contract_hashes.json with the contract address"
