from flask import Flask, jsonify, render_template
from flask_cors import CORS
from analisador import AnalisadorDeRede

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

analisador = AnalisadorDeRede('nodes.csv', 'edges.csv')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/nodes', methods=['GET'])
def get_nodes():
    """Retorna apenas a lista de nós para o mapeamento no frontend."""
    nodes_data = analisador.get_graph_data().get("nodes", [])
    return jsonify(nodes_data)

@app.route('/api/shortest-path/<start_node>/<end_node>', methods=['GET'])
def get_shortest_path(start_node, end_node):
    try:
        start_node = int(start_node)
        end_node = int(end_node)
    except ValueError:
        return jsonify({"error": "Os IDs dos nós devem ser números inteiros."}), 400

    result = analisador.dijkstra(start_node, end_node)
    if "error" in result:
        return jsonify(result), 404
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5001)