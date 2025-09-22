document.addEventListener('DOMContentLoaded', () => {
    const findPathButton = document.getElementById('find-path-button');
    const startNodeInput = document.getElementById('start-node-input');
    const endNodeInput = document.getElementById('end-node-input');
    const pathResultDiv = document.getElementById('path-result');
// Mapeia label para id
    let nodeMap = {}; 

    async function loadNodeMap() {
        try {
            const response = await fetch('http://127.0.0.1:5001/api/nodes');
            const nodes = await response.json();

            nodes.forEach(node => {
                // Armazena o nome em minúsculas para facilitar a busca
                nodeMap[node.label.toLowerCase()] = node.id;
            });
        } catch (error) {
            pathResultDiv.style.display = 'block';
            pathResultDiv.textContent = `Erro ao carregar dados da rede: ${error.message}`;
            pathResultDiv.style.backgroundColor = '#fbeee6'; 
            pathResultDiv.style.borderColor = '#c0392b';
        }
    }

    // Função que busca o caminho
    async function findPath() {
        const startLabel = startNodeInput.value.trim().toLowerCase();
        const endLabel = endNodeInput.value.trim().toLowerCase();

        if (!startLabel || !endLabel) {
            displayResult('Por favor, insira os roteadores de origem e destino.', true);
            return;
        }

        const startNodeId = nodeMap[startLabel];
        const endNodeId = nodeMap[endLabel];

        if (!startNodeId || !endNodeId) {
            displayResult('Roteador de origem ou destino não encontrado. Verifique os nomes.', true);
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:5001/api/shortest-path/${startNodeId}/${endNodeId}`);
            const result = await response.json();

            if (result.error || result.path_nodes.length === 0) {
                displayResult(result.error || 'Nenhum caminho encontrado.', true);
            } else {
                const resultText = `<strong>Caminho Encontrado:</strong> ${result.path_labels.join(' → ')} <br> <strong>Latência Total:</strong> ${result.distance} ms`;
                displayResult(resultText, false);
            }
        } catch (error) {
            displayResult(`Erro ao buscar o caminho: ${error.message}`, true);
        }
    }

    // Função que mostra o resultado
    function displayResult(message, isError = false) {
        pathResultDiv.innerHTML = message;
        pathResultDiv.style.display = 'block';
        if (isError) {
            pathResultDiv.style.backgroundColor = '#fbeee6';
            pathResultDiv.style.borderColor = '#c0392b';
            pathResultDiv.style.color = '#c0392b';
        } else {
            pathResultDiv.style.backgroundColor = '#e8f0fe';
            pathResultDiv.style.borderColor = '#1967d2';
            pathResultDiv.style.color = '#1967d2';
        }
    }

    findPathButton.addEventListener('click', findPath);

    endNodeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            findPath();
        }
    });

    startNodeInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            findPath();
        }
    });

    loadNodeMap();
});