<?php

namespace Tests\Feature;

use App\Models\Tarefa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TarefaTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lista_as_tarefas(): void
    {
        Tarefa::factory()->count(3)->create();

        $this->getJson('/api/tarefas')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [['id', 'title', 'completed', 'created_at', 'updated_at']],
            ]);
    }

    public function test_store_cria_uma_tarefa(): void
    {
        $this->postJson('/api/tarefas', ['title' => 'Nova tarefa'])
            ->assertCreated()
            ->assertJsonPath('data.title', 'Nova tarefa')
            ->assertJsonPath('data.completed', false);

        $this->assertDatabaseHas('tarefas', ['title' => 'Nova tarefa']);
    }

    public function test_store_exige_o_title(): void
    {
        $this->postJson('/api/tarefas', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('title');
    }

    public function test_update_altera_o_title(): void
    {
        $tarefa = Tarefa::factory()->create(['title' => 'Antigo']);

        $this->putJson("/api/tarefas/{$tarefa->id}", ['title' => 'Novo'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Novo');

        $this->assertDatabaseHas('tarefas', ['id' => $tarefa->id, 'title' => 'Novo']);
    }

    public function test_patch_alterna_o_completed(): void
    {
        $tarefa = Tarefa::factory()->create(['completed' => false]);

        $this->patchJson("/api/tarefas/{$tarefa->id}", ['completed' => true])
            ->assertOk()
            ->assertJsonPath('data.completed', true);

        $this->assertTrue($tarefa->fresh()->completed);
    }

    public function test_destroy_remove_a_tarefa(): void
    {
        $tarefa = Tarefa::factory()->create();

        $this->deleteJson("/api/tarefas/{$tarefa->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('tarefas', ['id' => $tarefa->id]);
    }

    public function test_destroy_de_tarefa_inexistente_retorna_404(): void
    {
        $this->deleteJson('/api/tarefas/999')
            ->assertNotFound();
    }
}
