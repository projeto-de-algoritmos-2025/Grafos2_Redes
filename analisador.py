import pandas as pd
import heapq

class AnalisadorDeRede:
    def __init__(self, nodes_path, edges_path):
        nodes_df = pd.read_csv(nodes_path)
        edges_df = pd.read_csv(edges_path)
        
        self.nodes = [int(node_id) for node_id in nodes_df['id']]
        self.node_names = dict(zip(nodes_df['id'].astype(int), nodes_df['label']))
        self.edges = []

        self.adj = {node: [] for node in self.nodes}
        
        # Adiciona um ID único para cada aresta
        edge_id_counter = 1
        for _, edge in edges_df.iterrows():
            u, v, weight = int(edge['source']), int(edge['target']), int(edge['weight'])
            
            if u in self.nodes and v in self.nodes:
                edge_info = {"id": f"e{edge_id_counter}", "from": u, "to": v, "label": str(weight), "weight": weight}
                self.edges.append(edge_info)
                
                # Adiciona o ID da aresta à lista de adjacência
                self.adj[u].append((v, weight, edge_info['id']))
                self.adj[v].append((u, weight, edge_info['id']))
                
                edge_id_counter += 1

    def dijkstra(self, start_node, end_node):
        if start_node not in self.nodes or end_node not in self.nodes:
            return {"path": [], "distance": float('inf'), "error": "Nó de início ou fim não encontrado."}

        distances = {node: float('inf') for node in self.nodes}
        previous_nodes = {node: (None, None) for node in self.nodes}
        distances[start_node] = 0
        
        priority_queue = [(0, start_node)]
        
        while priority_queue:
            current_distance, current_node = heapq.heappop(priority_queue)
            
            if current_distance > distances[current_node]:
                continue
            
            if current_node == end_node:
                break

            for neighbor, weight, edge_id in self.adj.get(current_node, []):
                distance = current_distance + weight
                
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous_nodes[neighbor] = (current_node, edge_id)
                    heapq.heappush(priority_queue, (distance, neighbor))

        # reconstroi o caminho
        path_nodes = []
        path_edges = []
        current = end_node
        
        if distances[current] != float('inf'):
            while current is not None:
                path_nodes.insert(0, current)
                prev_node, edge_id = previous_nodes[current]
                if edge_id:
                    path_edges.insert(0, edge_id)
                current = prev_node
        
        return {
            "path_nodes": path_nodes, 
            "path_edges": path_edges,
            "distance": distances[end_node],
            "path_labels": [self.node_names[node_id] for node_id in path_nodes]
        }

    def get_graph_data(self):
        nodes_formatados = [{"id": node_id, "label": self.node_names[node_id]} for node_id in self.nodes]
        return {"nodes": nodes_formatados, "edges": self.edges}