<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTarefaRequest;
use App\Http\Requests\UpdateTarefaRequest;
use App\Http\Resources\TarefaResource;
use App\Models\Tarefa;

class TarefaController extends Controller
{
    /**
     * Lista as tarefas (mais recentes primeiro).
     */
    public function index()
    {
        return TarefaResource::collection(Tarefa::latest()->get());
    }

    /**
     * Cria uma nova tarefa.
     */
    public function store(StoreTarefaRequest $request)
    {
        $tarefa = Tarefa::create($request->validated());

        return (new TarefaResource($tarefa))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Exibe uma tarefa.
     */
    public function show(Tarefa $tarefa)
    {
        return new TarefaResource($tarefa);
    }

    /**
     * Atualiza uma tarefa (PUT/PATCH) — inclui o toggle de `completed`.
     */
    public function update(UpdateTarefaRequest $request, Tarefa $tarefa)
    {
        $tarefa->update($request->validated());

        return new TarefaResource($tarefa);
    }

    /**
     * Remove uma tarefa.
     */
    public function destroy(Tarefa $tarefa)
    {
        $tarefa->delete();

        return response()->noContent();
    }
}
