package com.example.trelloclone.repository;

import com.example.trelloclone.entity.ListEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ListRepository extends JpaRepository<ListEntity, Long> {

    List<ListEntity> findAllByOrderBySortOrderAsc();
}
